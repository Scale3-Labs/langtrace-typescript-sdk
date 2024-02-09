"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import necessary OpenTelemetry components
const instrumentation_1 = require("@opentelemetry/instrumentation");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
// Import your custom OpenAI instrumentation
const instrumentation_2 = require("./instrumentation"); // Adjust the path as necessary
// Set up OpenTelemetry tracing
const provider = new sdk_trace_node_1.NodeTracerProvider();
// Use the ConsoleSpanExporter to print traces to the console
const consoleExporter = new sdk_trace_base_1.ConsoleSpanExporter();
provider.addSpanProcessor(new sdk_trace_base_1.SimpleSpanProcessor(consoleExporter));
// Register any automatic instrumentation and your custom OpenAI instrumentation
(0, instrumentation_1.registerInstrumentations)({
    instrumentations: [
        // getNodeAutoInstrumentations(), // This will automatically instrument supported libraries
        instrumentation_2.openAIInstrumentation,
    ],
    tracerProvider: provider,
});
// Make sure to register the provider
provider.register();
// Initialize dotenv
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
dotenv_1.default.config();
// Now you can use OpenAI SDK with OpenTelemetry instrumentation
const openai = new openai_1.default();
async function main() {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "gpt-3.5-turbo",
    });
    console.log(completion.choices[0]);
}
main();
