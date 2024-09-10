import { init } from '@langtrace-init/init'
import { Mistral } from '@mistralai/mistralai'

init({ write_spans_to_console: false, batch: false })

const client = new Mistral()

export async function chatStream (): Promise<void> {
  const stream = await client.chat.stream({
    model: 'mistral-tiny',
    messages: [{ role: 'user', content: 'What is the best French cheese?' }]
  })
  for await (const chunk of stream) {
    if (chunk.data.choices[0].delta.content !== undefined) {
      const streamText = chunk.data.choices[0].delta.content
      console.log(streamText)
    }
  }
}
