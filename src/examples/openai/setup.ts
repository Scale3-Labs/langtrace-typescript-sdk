// Import necessary OpenTelemetry components
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
// import { OpenAIInstrumentation } from "@traceloop/instrumentation-openai";

// Import your custom OpenAI instrumentation
import { openAIInstrumentation } from "../../instrumentation/openai/instrumentation";

export const setupInstrumentation = () => {
  // Set up OpenTelemetry tracing
  const tracerProvider = new NodeTracerProvider();

  // Use the ConsoleSpanExporter to print traces to the console
  const consoleExporter = new ConsoleSpanExporter();
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));

  // Register any automatic instrumentation and your custom OpenAI instrumentation
  registerInstrumentations({
    instrumentations: [openAIInstrumentation],
    // instrumentations: [new OpenAIInstrumentation()],
    tracerProvider: tracerProvider,
  });

  // Make sure to register the provider
  tracerProvider.register();
};
