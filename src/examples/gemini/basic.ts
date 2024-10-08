import { init } from '@langtrace-init/init'
import { GoogleGenerativeAI } from '@google/generative-ai'

import dotenv from 'dotenv'
dotenv.config()
init({ batch: false, write_spans_to_console: true })

if (process.env.GEMINI_API_KEY === undefined) {
  throw new Error('GEMINI_API_KEY is not defined')
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const basicGeminiChat = async (): Promise<void> => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 20,
      temperature: 1.0
    }
  })
  const prompt = 'Say hi twice'
  const result = await model.generateContent(prompt)
  console.log(result.response.text())
}

export const basicGeminiChatStream = async (): Promise<void> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = 'say hi 3 times'
  const result = await model.generateContentStream(prompt)

  for await (const chunk of result.stream) {
    const chunkText = chunk.text()
    process.stdout.write(chunkText)
  }
}
