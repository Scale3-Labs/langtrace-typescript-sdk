import { init } from '@langtrace-init/init'
import { Mistral } from '@mistralai/mistralai'

init({ write_spans_to_console: false, batch: false })

export async function chatCompletion (): Promise<void> {
  const client = new Mistral()

  const response = await client.chat.complete({
    model: 'mistral-tiny',
    messages: [
      { role: 'user', content: 'What are the best French cheeses?' }
    ],
    stream: false
  })

  console.info(response)
}
