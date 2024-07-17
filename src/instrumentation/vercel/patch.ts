/* eslint-disable @typescript-eslint/no-this-alias */
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { LLMSpanAttributes, Vendors, Event, FrameworkSpanAttributes } from '@langtrase/trace-attributes'
import { Exception, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'

export function generateTextPatch (
  this: any,
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  const patchThis = this
  return async function (this: any, ...args: any[]): Promise<any> {
    if (args[0]?.model?.config?.provider?.includes(Vendors.OPENAI) === true) {
      return await generateTextPatchOpenAI.call(this, patchThis, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    const result = originalMethod.apply(this, args)
    if (result instanceof Promise) {
      return await result
    }
    return result
  }
}

export function embedPatch (
  this: any,
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  const patchThis = this
  return async function (this: any, ...args: any[]): Promise<any> {
    if (args[0]?.model?.config?.provider?.includes(Vendors.OPENAI) === true) {
      return await embedPatchOpenAI.call(this, patchThis, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    const result = originalMethod.apply(this, args)
    if (result instanceof Promise) {
      return await result
    }
    return result
  }
}

}
