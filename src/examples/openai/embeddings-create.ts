import { setupInstrumentation } from "../setup";

setupInstrumentation();

import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

export async function embeddingsCreate() {
  const openai = new OpenAI();

  // Perform the first embedding operation within the context of the root span
  const embeddingsResult1 = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: "Once upon a time, there was a frog.",
  });

  const embeddingsResult2 = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: "In a land far, far away, lived a dragon.",
  });

  console.log(embeddingsResult1);
  console.log(embeddingsResult2);
}
