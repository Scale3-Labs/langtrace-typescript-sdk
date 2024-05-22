import weaviate from 'weaviate-ts-client'
import dotenv from 'dotenv'
dotenv.config()
export const basic = async (): Promise<void> => {
  const client = weaviate.client({
    apiKey: { apiKey: process.env.WEAVIATE_API_KEY ?? '' },
    host: process.env.WEAVIATE_HOST ?? '',
    headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY ?? ''},
  })

  const res = await client.schema.
}
