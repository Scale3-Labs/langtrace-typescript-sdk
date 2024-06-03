/*
 * Copyright (c) 2024 Scale3 Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { SERVICE_PROVIDERS } from '@langtrace-constants/instrumentation/common'
import { queryTypeToFunctionToProps } from '@langtrace-constants/instrumentation/weaviate'
import { setValueFromPath, getValueFromPath } from '@langtrace-utils/misc'
import { DatabaseSpanAttributes, Event } from '@langtrase/trace-attributes'
import { Exception, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'

interface PatchBuilderArgs {
  clientInstance: any
  clientArgs: Record<string, any>
  tracer: Tracer
  moduleVersion: string
  sdkName: string
  sdkVersion: string
}

/**
 * Patch the functions of the client instance that implement the CommandBase Interface in the Weaviate client
 * Patches the do function of the builder functions to add tracingp
 * @param this any
 * @param args  PatchBuilderArgs
 */
export const patchBuilderFunctions = function (this: any, { clientInstance, clientArgs, tracer, moduleVersion, sdkName, sdkVersion }: PatchBuilderArgs): void {
  // iterate over the queryTypeToFunctionToProps object and wrap the functions
  Object.entries(queryTypeToFunctionToProps).forEach(([queryType, functionsMap]) => {
    Object.entries(functionsMap).forEach(([func, properties]) => {
      const queryTypeKey = queryType as keyof typeof clientInstance
      if (queryTypeKey in clientInstance) {
        const funcKey = func as keyof typeof clientInstance[typeof queryTypeKey]
        if (clientInstance[queryTypeKey] !== undefined && typeof clientInstance[queryTypeKey][funcKey] === 'function') {
          // Wrap the function with to add tracing
          // example client.query.get
          clientInstance[queryTypeKey][funcKey] = this._wrap(clientInstance[queryTypeKey], func, (original: any) => {
            return (...originalArgs: any[]) => {
              // This is the instance that stores all the results of the different builder functions
              const functionCallInstance: Record<string, any> = original.apply(this, originalArgs)
              // Wrap the do function to add tracing
              // example client.query.get.do
              this._wrap(functionCallInstance, 'do', (originalDo: any) => {
                return async (...doArgs: any[]) => {
                  const queryObj: { [key: string]: any } = {}
                  properties.forEach((path) => {
                    const value = getValueFromPath(functionCallInstance, path)
                    if (value !== undefined) {
                      setValueFromPath(queryObj, path, value)
                    }
                  })
                  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
                  const collectionNameKey = functionsMap.collectionName.filter((path) => getValueFromPath(functionCallInstance, path) !== undefined)[0]
                  const attributes: DatabaseSpanAttributes = {
                    'langtrace.sdk.name': sdkName,
                    'langtrace.version': sdkVersion,
                    'langtrace.service.name': SERVICE_PROVIDERS.WEAVIATE,
                    'langtrace.service.type': 'vectordb',
                    'langtrace.service.version': moduleVersion,
                    'db.system': SERVICE_PROVIDERS.WEAVIATE,
                    'server.address': clientArgs.host,
                    'db.operation': `${queryType}.${func}`,
                    'db.collection.name': getValueFromPath(functionCallInstance, collectionNameKey),
                    'db.query': JSON.stringify(queryObj),
                    ...customAttributes
                  }
                  const span = tracer.startSpan(`${queryType}.${func}.do`, { kind: SpanKind.CLIENT, attributes }, context.active())
                  return await context.with(
                    trace.setSpan(context.active(), span),
                    async () => {
                      try {
                        const resp = await originalDo.apply(this, doArgs)
                        if (resp !== undefined) span.addEvent(Event.RESPONSE, { 'db.response': JSON.stringify(resp) })
                        span.setStatus({ code: SpanStatusCode.OK })
                        span.end()
                        return resp
                      } catch (error: any) {
                        span.recordException(error as Exception)
                        span.setStatus({
                          code: SpanStatusCode.ERROR,
                          message: error.message
                        })
                        span.end()
                        throw error
                      }
                    }
                  )
                }
              })
              return functionCallInstance
            }
          })
        }
      }
    })
  })
}
