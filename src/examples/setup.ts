// Import necessary OpenTelemetry components
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { langchainInstrumentation } from "../instrumentation/langchain/instrumentation";

// Import your custom instrumentation
// import { chromaInstrumentation } from "../instrumentation/chroma/instrumentation";
// import { llamaIndexInstrumentation } from "../instrumentation/llamaindex/instrumentation";
// import { openAIInstrumentation } from "../instrumentation/openai/instrumentation";
// import { pineconeInstrumentation } from "../instrumentation/pinecone/instrumentation";

export const setupInstrumentation = () => {
  // Set up OpenTelemetry tracing
  const tracerProvider = new NodeTracerProvider();

  // Use the ConsoleSpanExporter to print traces to the console
  const consoleExporter = new ConsoleSpanExporter();
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));

  // Make sure to register the provider
  tracerProvider.register();

  // Register any automatic instrumentation and your custom OpenAI instrumentation
  registerInstrumentations({
    instrumentations: [
      // llamaIndexInstrumentation,
      // pineconeInstrumentation,
      // openAIInstrumentation,
      // chromaInstrumentation,
      langchainInstrumentation,
    ],
    tracerProvider: tracerProvider,
  });
};
