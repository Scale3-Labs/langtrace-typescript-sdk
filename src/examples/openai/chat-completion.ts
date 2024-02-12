import { setupInstrumentation } from "./setup";

setupInstrumentation();

// Initialize dotenv
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

// Now you can use OpenAI SDK with OpenTelemetry instrumentation
const openai = new OpenAI();

export async function chatCompletion() {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Say this is a test 3 times" }],
  });

  console.log(completion.choices[0]);
}
