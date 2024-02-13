import { setupInstrumentation } from "../setup";

setupInstrumentation();

// Initialize dotenv
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI();

export async function imagesGeneration() {
  const image = await openai.images.generate({
    model: "dall-e-3",
    prompt: "A cute baby sea otter",
  });

  console.log(image.data);
}
