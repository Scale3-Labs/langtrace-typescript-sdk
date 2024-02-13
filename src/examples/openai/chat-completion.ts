import { setupInstrumentation } from "./setup";

setupInstrumentation();

// import * as traceloop from "@traceloop/node-server-sdk";

// traceloop.initialize({ disableBatch: true });

// Initialize dotenv
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

// Now you can use OpenAI SDK with OpenTelemetry instrumentation
const openai = new OpenAI();

export async function chatCompletion() {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "user", content: "Say this is a test 3 times" },
      {
        role: "assistant",
        content: "This is a test. This is a test. This is a test.",
      },
      { role: "user", content: "Say this is a mock 4 times" },
    ],
  });

  console.log(completion.choices[0]);
}
