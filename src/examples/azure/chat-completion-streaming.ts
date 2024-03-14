
import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

init()

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_API_ENDPOINT}${process.env.AZURE_OPENAI_GPT_DEPLOYMENT_NAME}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
})

export async function azureChatCompletionStreaming (): Promise<void> {
  const stream = await openai.chat.completions.create({
    model: process.env.AZURE_OPENAI_GPT_DEPLOYMENT_NAME as string,
    messages: [{ role: 'user', content: 'Say this is a test 3 times' }],
    stream: true
  })
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
  }
}
