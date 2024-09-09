import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import { Mistral } from '@mistralai/mistralai'

init({ write_spans_to_console: false, batch: false })

const client = new Mistral()

export async function embedText (): Promise<void> {
  await withLangTraceRootSpan(async () => {
    const embedding = await client.embeddings.create({
      model: 'mistral-embed',
      inputs: 'What is the best French cheese?'
    })
    console.log('Embedding:', embedding.data[0].embedding)
    return embedding
  })
}
