import { LangTraceExporter } from '@langtrace-extensions/langtraceexporter/langtrace_exporter'
import { anthropicInstrumentation } from '@langtrace-instrumentation/anthropic/instrumentation'
import { chromaInstrumentation } from '@langtrace-instrumentation/chroma/instrumentation'
import { llamaIndexInstrumentation } from '@langtrace-instrumentation/llamaindex/instrumentation'
import { openAIInstrumentation } from '@langtrace-instrumentation/openai/instrumentation'
import { pineconeInstrumentation } from '@langtrace-instrumentation/pinecone/instrumentation'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types'

export const init: LangTraceInit = ({
  api_key = undefined,
  batch = true,
  write_to_langtrace_cloud = true,
  debug_log_to_console = false,
  custom_remote_exporter = undefined
}: LangtraceInitOptions = {}) => {
  // Set up OpenTelemetry tracing
  const provider = new NodeTracerProvider()

  const remoteWriteExporter = new LangTraceExporter(api_key, write_to_langtrace_cloud)
  const consoleExporter = new ConsoleSpanExporter()
  const batchProcessorRemote = new BatchSpanProcessor(remoteWriteExporter)
  const simpleProcessorRemote = new SimpleSpanProcessor(remoteWriteExporter)
  const batchProcessorConsole = new BatchSpanProcessor(consoleExporter)
  const simpleProcessorConsole = new SimpleSpanProcessor(consoleExporter)

  if (debug_log_to_console) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
  }

  if (write_to_langtrace_cloud && !batch && custom_remote_exporter === undefined) {
    throw new Error('Batching is required when writing to the LangTrace cloud')
  }
  if (custom_remote_exporter !== undefined) {
    if (batch) {
      provider.addSpanProcessor(new BatchSpanProcessor(custom_remote_exporter))
    } else {
      provider.addSpanProcessor(new SimpleSpanProcessor(custom_remote_exporter))
    }
  } else if (!write_to_langtrace_cloud) {
    if (batch) {
      provider.addSpanProcessor(batchProcessorConsole)
    } else {
      provider.addSpanProcessor(simpleProcessorConsole)
    }
  } else {
    if (batch) {
      provider.addSpanProcessor(batchProcessorRemote)
    } else {
      provider.addSpanProcessor(simpleProcessorRemote)
    }
  }

  provider.register()

  // Register any automatic instrumentation and your custom OpenAI instrumentation
  registerInstrumentations({
    instrumentations: [
      pineconeInstrumentation,
      chromaInstrumentation,
      llamaIndexInstrumentation,
      openAIInstrumentation,
      anthropicInstrumentation
    ],
    tracerProvider: provider
  })
}
