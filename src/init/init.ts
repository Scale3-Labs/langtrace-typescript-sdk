/* eslint-disable @typescript-eslint/no-unsafe-argument */
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

import { getCurrentAndLatestVersion, boxText } from '@langtrace-utils/misc'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { Resource } from '@opentelemetry/resources'
import { InstrumentationBase, registerInstrumentations } from '@opentelemetry/instrumentation'
import { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { LangTraceExporter } from '@langtrace-extensions/langtraceexporter/langtrace_exporter'
import { LangtraceSampler } from '@langtrace-extensions/langtracesampler/langtrace_sampler'
import { LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types'
import { LANGTRACE_REMOTE_URL } from '@langtrace-constants/exporter/langtrace_exporter'
import { anthropicInstrumentation } from '@langtrace-instrumentation/anthropic/instrumentation'
import { chromaInstrumentation } from '@langtrace-instrumentation/chroma/instrumentation'
import { cohereInstrumentation } from '@langtrace-instrumentation/cohere/instrumentation'
import { geminiInstrumentation } from '@langtrace-instrumentation/gemini/instrumentation'
import { groqInstrumentation } from '@langtrace-instrumentation/groq/instrumentation'
import { llamaIndexInstrumentation } from '@langtrace-instrumentation/llamaindex/instrumentation'
import { openAIInstrumentation } from '@langtrace-instrumentation/openai/instrumentation'
import { pineconeInstrumentation } from '@langtrace-instrumentation/pinecone/instrumentation'
import { qdrantInstrumentation } from '@langtrace-instrumentation/qdrant/instrumentation'
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api'
import { weaviateInstrumentation } from '@langtrace-instrumentation/weaviate/instrumentation'
import c from 'ansi-colors'
import { pgInstrumentation } from '@langtrace-instrumentation/pg/instrumentation'
import { ollamaInstrumentation } from '@langtrace-instrumentation/ollama/instrumentation'
import { Vendor } from '@langtrase/trace-attributes'
import { vercelAIInstrumentation } from '@langtrace-instrumentation/vercel/instrumentation'
import { DropAttributesProcessor } from '@langtrace-extensions/spanprocessors/DropAttributesProcessor'
import { vertexAIInstrumentation } from '@langtrace-instrumentation/vertexai/instrumentation'
import { mistralInstrumentation } from '@langtrace-instrumentation/mistral/instrumentation'
import { awsbedrockInstrumentation } from '@langtrace-instrumentation/awsbedrock/instrumentation'
import { LangtraceSdkError } from 'errors/sdk_error'

/**
 * Initializes the LangTrace sdk with custom options.
 *
 * @param api_key API key for Langtrace.
 * @param batch Whether to batch spans before exporting.
 *      This helps in reducing the number of requests made to the server.
 * @param write_spans_to_console Whether to write spans to Langtrace cloud.
 *      Enables direct storage of spans in the cloud for accessibility and analysis.
 * @param custom_remote_exporter Custom remote exporter to use.
 *      This allows for customization of the span export process to meet specific needs.
 * @param instrumentations Instrumentations to enable.
 *      This is used for next.js applications as automatic instrumentation is not supported.
 * @param api_host API host to send spans to.
 *      Specifies the destination server for the span data. For self hosted instances, this should be set to <HOSTED_LANGTRACE_URL>/api/trace.
 * @param disable_instrumentations Instrumentations to disable.
 *  - all_except: will disable all instrumentations except the ones specified.
 *  - only: will disable only the instrumentations specified.
 *  - If both 'all_except' and 'only' are specified, an error will be thrown.
 * @param logging Logging configuration.
 *  - level: Log level to use.
 *  - logger: Logger to use.
 *  - disable: Whether to disable logging.
 * @param disable_latest_version_check Whether to disable the check for the latest version of the sdk.
 * @param disable_tracing_for_functions Functions per vendor to disable tracing for.
 * @param disable_tracing_attributes Attributes to drop from spans.
*/

let isLatestSdk = false

export const init: LangTraceInit = ({
  api_key = undefined,
  service_name = undefined,
  batch = false,
  write_spans_to_console = false,
  custom_remote_exporter = undefined,
  instrumentations = undefined,
  api_host = LANGTRACE_REMOTE_URL,
  disable_instrumentations = {},
  logging = {
    level: DiagLogLevel.INFO,
    logger: new DiagConsoleLogger(),
    disable: false
  },
  disable_latest_version_check = false,
  disable_tracing_for_functions = undefined,
  disable_tracing_attributes = []
}: LangtraceInitOptions = {}) => {
  const provider = new NodeTracerProvider({
    sampler: new LangtraceSampler(disable_tracing_for_functions),
    resource: new Resource({ 'service.name': process.env.OTEL_SERVICE_NAME ?? service_name ?? __filename ?? 'unknown' })
  }
  )
  const host = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? process.env.LANGTRACE_API_HOST ?? api_host ?? LANGTRACE_REMOTE_URL
  const otelHttpHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS?.split(',')
    .reduce((acc, header) => {
      const [key, value] = header.split('=')
      acc[key] = value
      return acc
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    }, {} as Record<string, string>)
  const remoteWriteExporter = new LangTraceExporter(api_key ?? process.env.LANGTRACE_API_KEY ?? '', host, otelHttpHeaders)
  const consoleExporter = new ConsoleSpanExporter()
  const batchProcessorRemote = new BatchSpanProcessor(remoteWriteExporter)
  const simpleProcessorRemote = new SimpleSpanProcessor(remoteWriteExporter)
  const simpleProcessorConsole = new SimpleSpanProcessor(consoleExporter)

  process.env.LANGTRACE_API_HOST = host.replace('/api/trace', '')
  diag.setLogger(logging.logger ?? new DiagConsoleLogger(), { suppressOverrideMessage: true, logLevel: logging.level })

  if (logging.disable === true) {
    diag.disable()
  }
  if (!isLatestSdk && !disable_latest_version_check) {
    void getCurrentAndLatestVersion().then((res) => {
      if (res !== undefined) {
        if (res.latestVersion !== res.currentVersion) {
          const versionOudatedMessage = `${c.white(`Version ${c.red(res.currentVersion)} is outdated`)}`
          const installUpdateMessage = `${c.white(`To update to the latest version ${c.green(res.latestVersion)} run the command below\n\n${c.green('npm uninstall @langtrase/typescript-sdk && npm i @langtrase/typescript-sdk')}`)}`
          const message = boxText(`${versionOudatedMessage}\n\n${installUpdateMessage}`)
          // eslint-disable-next-line no-console
          console.log(c.yellow(message))
        } else {
          isLatestSdk = true
        }
      }
    })
  }

  if (api_host === LANGTRACE_REMOTE_URL && !write_spans_to_console) {
    if (api_key === undefined && process.env.LANGTRACE_API_KEY === undefined) {
      diag.warn('No API key provided. Please provide an API key to start sending traces to Langtrace.')
    }
  }
  if (api_key !== undefined) {
    process.env.LANGTRACE_API_KEY = api_key
  }
  if (write_spans_to_console) {
    provider.addSpanProcessor(simpleProcessorConsole)
  } else if (api_host !== undefined && custom_remote_exporter === undefined) {
    if (batch) {
      provider.addSpanProcessor(batchProcessorRemote)
    } else {
      provider.addSpanProcessor(simpleProcessorRemote)
    }
  } else if (custom_remote_exporter !== undefined) {
    if (batch) {
      provider.addSpanProcessor(new BatchSpanProcessor(custom_remote_exporter))
    } else {
      provider.addSpanProcessor(new SimpleSpanProcessor(custom_remote_exporter))
    }
  }
  provider.addSpanProcessor(new DropAttributesProcessor(disable_tracing_attributes))
  if (!global.langtrace_initalized) {
    provider.register()
  }
  const allInstrumentations: Record<Vendor, any> = {
    openai: openAIInstrumentation,
    cohere: cohereInstrumentation,
    anthropic: anthropicInstrumentation,
    gemini: geminiInstrumentation,
    mistral: mistralInstrumentation,
    awsbedrock: awsbedrockInstrumentation,
    groq: groqInstrumentation,
    pinecone: pineconeInstrumentation,
    llamaindex: llamaIndexInstrumentation,
    chromadb: chromaInstrumentation,
    qdrant: qdrantInstrumentation,
    weaviate: weaviateInstrumentation,
    pg: pgInstrumentation,
    ai: vercelAIInstrumentation,
    ollama: ollamaInstrumentation,
    vertexai: vertexAIInstrumentation
  }
  const initOptions: LangtraceInitOptions = {
    api_key,
    batch,
    write_spans_to_console,
    custom_remote_exporter,
    instrumentations,
    api_host,
    disable_instrumentations,
    logging,
    disable_latest_version_check,
    disable_tracing_for_functions,
    disable_tracing_attributes
  }
  if (instrumentations === undefined) {
    registerInstrumentations({
      instrumentations: Object.values(allInstrumentations).filter((instrumentation) => instrumentation !== undefined),
      tracerProvider: provider
    })
    disableInstrumentations(disable_instrumentations, allInstrumentations)
  } else {
    Object.entries(instrumentations).forEach(([key, value]) => {
      if (value !== undefined) {
        allInstrumentations[key as Vendor].manualPatch(value)
      }
    })
    registerInstrumentations({ tracerProvider: provider })
    disableInstrumentations(disable_instrumentations, allInstrumentations, instrumentations)
  }
  global.langtrace_initalized = true
  global.langtrace_options = initOptions

  diag.info('⭐ Leave our github a star to stay on top of our updates - https://github.com/Scale3-Labs/langtrace')
}

const disableInstrumentations = (disable_instrumentations: { all_except?: string[], only?: string[] }, allInstrumentations: Record<Vendor, any>, modules?: { [key in Vendor]?: any }): InstrumentationBase[] => {
  if (disable_instrumentations.only !== undefined && disable_instrumentations.all_except !== undefined) {
    throw new LangtraceSdkError('Cannot specify both only and all_except in disable_instrumentations')
  }
  const instrumentations = Object.fromEntries(Object.entries(allInstrumentations)
    .filter(([key, instrumentation]) => {
      if (instrumentation === undefined) {
        return false
      }
      if (disable_instrumentations.all_except !== undefined) {
        if (!disable_instrumentations.all_except.includes(key as Vendor)) {
          if (modules !== undefined && modules[key as Vendor] !== undefined) {
            instrumentation._unpatch(modules[key as Vendor])
          } else {
            instrumentation.disable()
          }
          return false
        }
      }
      if (disable_instrumentations.only !== undefined) {
        if (disable_instrumentations.only.includes(key as Vendor)) {
          if (modules !== undefined && modules[key as Vendor] !== undefined) {
            instrumentation._unpatch(modules[key as Vendor])
          } else {
            instrumentation.disable()
          }
        }
      }
      return true
    }))
  return Object.values(instrumentations)
}
