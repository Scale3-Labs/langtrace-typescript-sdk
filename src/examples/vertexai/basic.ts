import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import { VertexAI } from '@google-cloud/vertexai'

dotenv.config()
init({ batch: false, write_spans_to_console: true })

const project = 'model-palace-429011-f5'
const location = 'us-central1'
const textModel = 'gemini-1.5-flash'

const vertexAI = new VertexAI({ project, location })

const generativeModel = vertexAI.getGenerativeModel({ model: textModel })

export const basicVertexAIChat = async (): Promise<void> => {
  const request = { contents: [{ role: 'user', parts: [{ text: 'How are you doing today?' }] }] }
  const result = await generativeModel.generateContent(request)
  const response = result.response
  console.log('Response: ', JSON.stringify(response))
}

export const basicVertexAIDirectPromptStream = async (): Promise<void> => {
  const prompt = 'Write a story about a magic backpack.'
  const result = await generativeModel.generateContentStream(prompt)

  // Print text as it comes in.
  for await (const item of result.stream) {
    console.log('stream chunk: ', JSON.stringify(item))
  }
}

export const basicVertexAIChatStream = async (): Promise<void> => {
  const request = { contents: [{ role: 'user', parts: [{ text: 'How are you doing today?' }] }] }
  const streamingResult = await generativeModel.generateContentStream(request)
  for await (const item of streamingResult.stream) {
    console.log('stream chunk: ', JSON.stringify(item))
  }
  const aggregatedResponse = await streamingResult.response
  console.log('aggregated response: ', JSON.stringify(aggregatedResponse))
}

export const basicImageVertexAIChat = async (): Promise<void> => {
  const filePart = { fileData: { fileUri: 'gs://generativeai-downloads/images/scones.jpg', mimeType: 'image/jpeg' } }
  const textPart = { text: 'What is this picture about?' }
  const request = { contents: [{ role: 'user', parts: [textPart, filePart] }] }
  const streamingResult = await generativeModel.generateContentStream(request)
  for await (const item of streamingResult.stream) {
    console.log('stream chunk: ', JSON.stringify(item))
  }
}

export const basicVertexAIStartChat = async (): Promise<void> => {
  const chat = generativeModel.startChat()
  const chatInput = 'How can I learn more about Node.js?'
  const result = await chat.sendMessage(chatInput)
  const response = result.response
  console.log('response: ', JSON.stringify(response))
}

export const basicVertexAIStartChatStream = async (): Promise<void> => {
  const chat = generativeModel.startChat();
  const chatInput = "How can I learn more about Node.js?";
  const result = await chat.sendMessageStream(chatInput);
  for await (const item of result.stream) {
    const text = item.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log("Stream chunk: ", text);
    } else {
      console.log("Stream chunk: No text available");
    }
  }
  const aggregatedResponse = await result.response;
  console.log('Aggregated response: ', JSON.stringify(aggregatedResponse));
}
