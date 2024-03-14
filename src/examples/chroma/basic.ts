
import { init } from '@langtrace-init/init'
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb'
import dotenv from 'dotenv'
dotenv.config()
init()

export async function basic (): Promise<void> {
  const client = new ChromaClient()
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY as string
  })
  console.info('Creating collection')
  await client.createCollection({
    name: 'my6_collection',
    embeddingFunction: embedder
  })

  const collection = await client.getCollection({
    name: 'my6_collection',
    embeddingFunction: embedder
  })
  console.info('Adding documents')
  await collection.add({
    ids: ['id1', 'id2'],
    metadatas: [{ source: 'my_source' }, { source: 'my_source' }],
    documents: ['This is a document', 'This is another document']
  })
  console.info('Querying documents')
  const results = await collection.query({
    nResults: 2,
    queryTexts: ['This is a query document']
  })

  console.info(results)
}
