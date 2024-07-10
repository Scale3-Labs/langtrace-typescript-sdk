import { init } from '@langtrace-init/init'
import * as a from 'ai'
import { openai } from '@ai-sdk/openai' // Ensure OPENAI_API_KEY environment variable is set

init({ write_spans_to_console: true, instrumentations: { ai: a } })
export async function basic (): Promise<void> {
  const { text } = await a.generateText({
    model: openai('gpt-4-turbo', { user: 'abc' }),
    system: 'You are a friendly assistant!',
    // prompt: 'Why is the sky blue?',
    temperature: 0.5,
    topP: 1,
    maxRetries: 3,
    maxTokens: 1024,
    messages: [{ role: 'system', content: 'You are a friendly assistant' }, { role: 'user', content: 'why is the sky blue' }]
  })
  console.log(text)
}
