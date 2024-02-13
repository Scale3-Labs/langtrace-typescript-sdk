import { setupInstrumentation } from "../openai/setup";

setupInstrumentation();

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { ConversationChain } from "langchain/chains";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { BufferMemory } from "langchain/memory";

import dotenv from "dotenv";
dotenv.config();

export async function langchainBasic() {
  const chat = new ChatOpenAI({ temperature: 0 });
  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.",
    ],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "history",
  });

  const chain = new ConversationChain({
    memory: memory,
    prompt: chatPrompt,
    llm: chat,
  });

  const response1 = await chain.call({
    input: "hi! whats up?",
  });

  console.log(response1);

  const response2 = await chain.call({
    input: "what did i ask?",
  });

  console.log(response2);
}

export async function langchainChain() {
  const llm = new ChatOpenAI({ temperature: 0 });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Answer the user's questions based on the below context:\n\n{context}",
    ],
  ]);

  const chain = createStuffDocumentsChain({
    llm: llm,
    prompt: prompt,
  });
  const response1 = await (
    await chain
  ).invoke({
    input: "hi! whats up?",
  });

  console.log(response1);
}
