import { init } from '@langtrace-init/init'
import { openai } from '@ai-sdk/openai' // Ensure OPENAI_API_KEY environment variable is set
import { getTracedSdk } from '@langtrace-utils/langtrace'

init({ write_spans_to_console: true, disable_instrumentations: { only: ['ai'] } })
export async function basic (): Promise<void> {
  const sdk = getTracedSdk('ai')
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
