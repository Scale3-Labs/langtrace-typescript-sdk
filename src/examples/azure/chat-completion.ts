// Initialize dotenv
import { init } from "@langtrace-init/init";
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

init();

export async function azureChatCompletion() {
  const openai = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_API_ENDPOINT}${process.env.AZURE_OPENAI_GPT_DEPLOYMENT_NAME}`,
    defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
  });
  const completion = await openai.chat.completions.create({
    model: process.env.AZURE_OPENAI_GPT_DEPLOYMENT_NAME as string,
    messages: [
      { role: "user", content: "Say this is a test 3 times" },
      {
        role: "assistant",
        content: "This is a test. This is a test. This is a test.",
      },
      { role: "user", content: "Say this is a mock 4 times" },
    ],
  });

  console.info(completion.choices[0]);
}
