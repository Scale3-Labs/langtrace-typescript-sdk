// Import necessary OpenTelemetry components
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// Import your custom OpenAI instrumentation
import { openAIInstrumentation } from "./instrumentation"; // Adjust the path as necessary

// Set up OpenTelemetry tracing
const provider = new NodeTracerProvider();

// Use the ConsoleSpanExporter to print traces to the console
const consoleExporter = new ConsoleSpanExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));

// Register any automatic instrumentation and your custom OpenAI instrumentation
registerInstrumentations({
  instrumentations: [
    // getNodeAutoInstrumentations(), // This will automatically instrument supported libraries
    openAIInstrumentation,
  ],
  tracerProvider: provider,
});

// Make sure to register the provider
provider.register();

// Initialize dotenv
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

// Now you can use OpenAI SDK with OpenTelemetry instrumentation
const openai = new OpenAI();

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    model: "gpt-3.5-turbo",
  });

  console.log(completion.choices[0]);
}

main();
