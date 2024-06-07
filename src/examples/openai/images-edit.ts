// Initialize dotenv
import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import fs from 'fs'
dotenv.config()

init({ write_spans_to_console: true, batch: false, disable_tracing_for_functions: { openai: ['openai.images.edit'] } })

const openai = new OpenAI()

export async function imageEdit (): Promise<void> {
  const image = await openai.images.edit({
    image: fs.createReadStream('src/examples/openai/cat-clip-art.png'),
    prompt: 'Edit the image to make it look like a painting.'
  })

  console.info(image.data)
}
