import { openai } from '@ai-sdk/openai'
import { init } from '@langtrace-init/init'
import ai from '@langtrace-module-wrappers/ai'
import { withAdditionalAttributes } from '@langtrace-utils/instrumentation'

init({
  write_spans_to_console: true,
  instrumentations: { ai }
})
export async function basic (): Promise<void> {
  await withAdditionalAttributes(async () => {
    await ai.generateText({
      model: openai('gpt-4-turbo', { user: 'abc' }),
      system: 'You are a friendly assistant!',
      // prompt: 'Why is the sky blue?',
      temperature: 0.5,
      topP: 1,
      maxRetries: 3,
      maxTokens: 1024,
      messages: [{ role: 'system', content: 'hi' }, { role: 'user', content: 'why is the sky blue' }]
    })
    // console.info(resp)
  }, { 'langtrace.span.name': 'basic' })
}
export async function basicStream (): Promise<void> {
  const resp = await ai.streamText({
    model: openai('gpt-4-turbo', { user: 'abc' }),
    system: 'You are a friendly assistant!',
    // prompt: 'Why is the sky blue?',
    temperature: 0.5,
    topP: 1,
    maxRetries: 3,
    maxTokens: 1024,
    messages: [{ role: 'system', content: 'hi' }, { role: 'user', content: 'why is the sky blue' }]
  })
  for await (const message of resp.textStream) {
    process.stdout.write(message as string)
  }
}

export const basicEmbed = async (): Promise<void> => {
  await ai.embed({ model: openai.embedding('text-embedding-3-large', { user: 'abc', dimensions: 10, maxEmbeddingsPerCall: 2 }), value: 'hey there its a very nice day out today', maxRetries: 3 })
  // console.info(resp)
}

export const basicEmbedMany = async (): Promise<void> => {
  await ai.embedMany({ model: openai.embedding('text-embedding-3-large', { user: 'abc', dimensions: 10, maxEmbeddingsPerCall: 2 }), values: ['hey there its a very nice day out today'], maxRetries: 3 })
  // console.info(resp)
}
