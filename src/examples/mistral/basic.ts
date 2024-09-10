// Initialize dotenv
// import { init } from '@langtrace-init/init'
// import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'
import { Mistral } from '@mistralai/mistralai'
dotenv.config()

// init({ write_spans_to_console: false, batch: false })

export async function chatCompletion (): Promise<void> {
  const client = new Mistral({ apiKey: 'iHN9Q428viFiqh47xZ766XLjSmqnAlvl' })

  const response = await client.chat.complete({
    model: 'mistral-tiny',
    messages: [
      { role: 'user', content: 'What are the best French cheeses?' }
    ],
    stream: false
  })

  console.info(response)
}
