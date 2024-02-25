import { setupInstrumentation } from "../setup";

setupInstrumentation();

// Initialize dotenv
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

export async function chatCompletion() {
  const openai = new OpenAI();

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

  const completion2 = await openai.chat.completions.create({
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

  console.log(completion2.choices[0]);
  console.log(completion.choices[0]);
}
