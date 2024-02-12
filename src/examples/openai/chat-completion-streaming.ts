import { setupInstrumentation } from "./setup";

setupInstrumentation();

import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI();

export async function chatCompletionStreaming() {
  const stream = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Say this is a test 3 times" }],
    stream: true,
  });
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}
