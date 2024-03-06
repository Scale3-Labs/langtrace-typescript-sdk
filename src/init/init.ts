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
export const init: LangTraceInit = ({api_key, remote_url, batch, log_spans_to_console, write_to_remote_url}: LangtraceInitOptions = {} ) => {
  // Set up OpenTelemetry tracing
  const provider = new NodeTracerProvider();
  //This can be replaced with a different exporter if needed for testing (e.g. ConsoleSpanExporter)
  const remoteWriteExporter = new LangTraceExporter(api_key, remote_url);
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  // let processor = null
  // if(batch===true && write_to_remote_url===true){
  //   processor = new BatchSpanProcessor(remoteWriteExporter);
  // }
  // if(!batch && write_to_remote_url===true){
  //   processor = new SimpleSpanProcessor(remoteWriteExporter);
  // }
  // if(log_spans_to_console===true && !batch ){
  //   provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  // }
  // if(log_spans_to_console===true && batch){
  //   provider.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));
  // }
  // // let spanProcessor: BatchSpanProcessor | SimpleSpanProcessor = new SimpleSpanProcessor(exporter);
  // if(batch===true && write_to_remote_url===true){
  //   // spanProcessor = new BatchSpanProcessor(remoteWriteExporter);
  // } 
  // provider.addSpanProcessor(processor);
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