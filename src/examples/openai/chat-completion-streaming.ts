import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI()

init({ write_spans_to_console: false })

export async function chatCompletionStreaming (): Promise<void> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Say this is a test 3 times' }],
    stream: true
  })
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
  }
}
