// Import necessary OpenTelemetry components
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { MeterProvider } from "@opentelemetry/sdk-metrics-base";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// Import your custom OpenAI instrumentation
import { openAIInstrumentation } from "./openai";

export const setupInstrumentation = () => {
  // Set up OpenTelemetry tracing
  const tracerProvider = new NodeTracerProvider();

  // Set up OpenTelemetry metrics
  const meterProvider = new MeterProvider();

  // Use the ConsoleSpanExporter to print traces to the console
  const consoleExporter = new ConsoleSpanExporter();
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));

  // Register any automatic instrumentation and your custom OpenAI instrumentation
  registerInstrumentations({
    instrumentations: [openAIInstrumentation],
    tracerProvider: tracerProvider,
  });

  // Make sure to register the provider
  tracerProvider.register();
};
