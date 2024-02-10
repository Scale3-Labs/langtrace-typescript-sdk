import { setupInstrumentation } from "../instrumentation/instrumentation-setup";

setupInstrumentation();

// Initialize dotenv
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

// Now you can use OpenAI SDK with OpenTelemetry instrumentation
const openai = new OpenAI();

export async function chatCompletion() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    model: "gpt-3.5-turbo",
  });

  console.log(completion.choices[0]);
}
