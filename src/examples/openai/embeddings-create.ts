import { init } from "@langtrace-init/init";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

init();

export async function embeddingsCreate() {
  const openai = new OpenAI();

  // Perform the first embedding operation within the context of the root span
  await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: "Once upon a time, there was a frog.",
  });
}
