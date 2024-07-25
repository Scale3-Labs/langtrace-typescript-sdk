// Initialize dotenv
import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'
import OpenAI from 'openai'
dotenv.config()

init()

export async function chatCompletion (): Promise<void> {
  const openai = new OpenAI()

  await withLangTraceRootSpan(async (spanId, traceId) => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Talk like a pirate' },
        { role: 'user', content: 'Tell me a story in 3 sentences or less.' }
      ],
      stream: false
    })

    console.info(response)
  })
}
