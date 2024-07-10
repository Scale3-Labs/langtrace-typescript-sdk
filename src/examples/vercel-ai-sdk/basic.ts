import { init } from '@langtrace-init/init'
import * as a from 'ai'
import { openai } from '@ai-sdk/openai' // Ensure OPENAI_API_KEY environment variable is set
import { getVercelAISdk } from '@langtrace-instrumentation/vercel/instrumentation'

init({ write_spans_to_console: true, instrumentations: { ai: a }, disable_instrumentations: { only: ['ai'] } })
export async function basic (): Promise<void> {
  const sdk = getVercelAISdk()
  const { text } = await sdk.generateText({
    model: openai('gpt-4-turbo', { user: 'abc' }),
    system: 'You are a friendly assistant!',
    // prompt: 'Why is the sky blue?',
    temperature: 0.5,
    topP: 1,
    maxRetries: 3,
    maxTokens: 1024,
    messages: [{ role: 'system', content: 'hi' }, { role: 'user', content: 'why is the sky blue' }]
  })
  // console.log(text)
}
