import { init } from '@langtrace-init/init'
import { openai } from '@ai-sdk/openai' // Ensure OPENAI_API_KEY environment variable is set
import ai from '@langtrace-module-wrappers/ai'

init({ write_spans_to_console: true, instrumentations: { ai }, disable_instrumentations: { only: ['ai'] } })
export async function basic (): Promise<void> {
  const { text } = await ai.generateText({
    model: openai('gpt-4-turbo', { user: 'abc' }),
    system: 'You are a friendly assistant!',
    // prompt: 'Why is the sky blue?',
    temperature: 0.5,
    topP: 1,
    maxRetries: 3,
    maxTokens: 1024,
    messages: [{ role: 'system', content: 'hi' }, { role: 'user', content: 'why is the sky blue' }]
  })
  console.log(text)
}
