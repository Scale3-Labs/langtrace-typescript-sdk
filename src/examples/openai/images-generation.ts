// Initialize dotenv
import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import OpenAI from 'openai'
dotenv.config()

init({ write_to_langtrace_cloud: false, batch: false })

const openai = new OpenAI()

export async function imagesGeneration (): Promise<void> {
  const image = await openai.images.generate({
    model: 'dall-e-3',
    prompt: 'A cute baby sea otter'
  })

  console.info(image.data)
}
