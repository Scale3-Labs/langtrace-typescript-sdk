// Initialize dotenv
import { init } from '@langtrace-init/init'
import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
dotenv.config()
init({ batch: false, write_spans_to_console: false, disable_instrumentations: { all_except: ['openai', 'pinecone'] } })

const pc = new Pinecone()
const openai = new OpenAI()

export async function basic (): Promise<void> {
  await withLangTraceRootSpan(async () => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Some random text string goes here',
      encoding_format: 'float'
    })

    // Assuming the embedding is in the `data` field of the response and
    // that you're interested in the first embedding if multiple are returned.
    const embedding = response.data[0].embedding

    // Prepare the data for Pinecone in the format { key: value }
    // You need to generate or define a unique ID for each embedding
    const uniqueId = 'randomid' // This should be unique for each embedding
    const dataToUpsert = { id: uniqueId, values: embedding }

    const index = pc.index('test-index')

    // Upsert the data into your index
    await index.upsert([dataToUpsert])

    const resp = await pc
      .index('test-index')
      .query({ topK: 3, vector: embedding })
    console.info(resp)
  })
}
