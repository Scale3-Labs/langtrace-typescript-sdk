import { LangTraceExporter } from "@langtrace-extensions/langtraceexporter/langtrace_exporter";
import { chromaInstrumentation } from "@langtrace-instrumentation/chroma/instrumentation";
import { llamaIndexInstrumentation } from "@langtrace-instrumentation/llamaindex/instrumentation";
import { openAIInstrumentation } from "@langtrace-instrumentation/openai/instrumentation";
import { pineconeInstrumentation } from "@langtrace-instrumentation/pinecone/instrumentation";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangTraceInit, LangtraceInitOptions } from "@langtrace-init/types";

/**
 *
 * @param api_key Your API key. If not set, the value will be read from the LANGTRACE_API_KEY environment variable
 * @param remote_url The endpoint to send the spans to. If not set, the value will be read from the LANGTRACE_URL environment variable
 * @returns void
 */
export const init: LangTraceInit = ({api_key, remote_url}: LangtraceInitOptions = {} ) => {
  // Set up OpenTelemetry tracing
  const provider = new NodeTracerProvider({});
  const exporter = new LangTraceExporter(api_key, remote_url);
  // const exporter  = new ZipkinExporter({serviceName: 'langtrace', url: 'http://localhost:4000/traces'});
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  const simpleSpanProcessor = new BatchSpanProcessor(exporter);
  provider.addSpanProcessor(simpleSpanProcessor);
  provider.register();

  // Register any automatic instrumentation and your custom OpenAI instrumentation
  registerInstrumentations({
    instrumentations: [
      pineconeInstrumentation,
      chromaInstrumentation,
      llamaIndexInstrumentation,
      openAIInstrumentation,
    ],
    tracerProvider: provider,
  });
};