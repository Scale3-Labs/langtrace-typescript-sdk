// Initialize dotenv
import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'
import OpenAI from 'openai'
dotenv.config()

init({ write_to_remote_url: false, batch: false })

export async function chatCompletion (): Promise<void> {
  const openai = new OpenAI()

  await withLangTraceRootSpan(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Say this is a test 3 times' }
      ],
      stream: false
    })

    console.info(response)
  })
}
