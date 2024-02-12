import { setupInstrumentation } from "../openai/setup";

setupInstrumentation();

import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
dotenv.config();

export async function langchainBasic() {
  const model = new ChatOpenAI();
  const promptTemplate = PromptTemplate.fromTemplate(
    "Tell me a joke about {topic}"
  );

  const chain = promptTemplate.pipe(model);

  const stream = await chain.stream({ topic: "bears" });

  // Each chunk has the same interface as a chat message
  for await (const chunk of stream) {
    console.log(chunk?.content);
  }
}
