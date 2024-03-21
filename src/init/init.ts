import { LangTraceExporter } from '@langtrace-extensions/langtraceexporter/langtrace_exporter'
import { LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types'
import { anthropicInstrumentation } from '@langtrace-instrumentation/anthropic/instrumentation'
import { chromaInstrumentation } from '@langtrace-instrumentation/chroma/instrumentation'
import { llamaIndexInstrumentation } from '@langtrace-instrumentation/llamaindex/instrumentation'
import { openAIInstrumentation } from '@langtrace-instrumentation/openai/instrumentation'
import { pineconeInstrumentation } from '@langtrace-instrumentation/pinecone/instrumentation'
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

/**
 *
 * @param api_key Your API key. If not set, the value will be read from the LANGTRACE_API_KEY environment variable
 * @param batch If true, spans will be batched before being sent to the remote URL
 * @param log_spans_to_console If true, spans will be logged to the console
 * @param write_to_langtrace_cloud If true, spans will be sent to the langtrace cloud
 * @returns void
 */
export const init: LangTraceInit = (
  {
    api_key,
    batch,
    write_to_langtrace_cloud,
    debug_log_to_console,
    custom_remote_exporter
  }: LangtraceInitOptions = {
    batch: false,
    debug_log_to_console: false,
    write_to_langtrace_cloud: true
  }
) => {
  // Set up OpenTelemetry tracing
  const provider = new NodeTracerProvider()

  const remoteWriteExporter = custom_remote_exporter ?? new LangTraceExporter(
    api_key,
    write_to_langtrace_cloud
  )
  const consoleExporter = new ConsoleSpanExporter()
  const batchProcessorRemote = new BatchSpanProcessor(remoteWriteExporter)
  const simpleProcessorRemote = new SimpleSpanProcessor(remoteWriteExporter)
  const batchProcessorConsole = new BatchSpanProcessor(consoleExporter)
  const simpleProcessorConsole = new SimpleSpanProcessor(consoleExporter)

  if (debug_log_to_console === true) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
  }
  if (write_to_remote_url === false) {
    if (batch === true) {
      provider.addSpanProcessor(batchProcessorConsole)
    } else {
      provider.addSpanProcessor(simpleProcessorConsole)
    }
  } else {
    if (batch === true) {
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
