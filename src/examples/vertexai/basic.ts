import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import { VertexAI, FunctionDeclarationSchemaType } from '@google-cloud/vertexai'

dotenv.config()
init({ batch: false, write_spans_to_console: true })

const project = 'vertex-test-454100'
const location = 'us-central1'
const textModel = 'gemini-2.0-flash-lite-001'

const vertexAI = new VertexAI({ project, location })

const generativeModel = vertexAI.getGenerativeModel({ model: textModel })

const previewGenerationModel = vertexAI.preview.getGenerativeModel({ model: textModel })

const functionDeclarations = [
  {
    functionDeclarations: [
      {
        name: 'get_current_weather',
        description: 'get weather in a given location',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            location: { type: FunctionDeclarationSchemaType.STRING },
            unit: {
              type: FunctionDeclarationSchemaType.STRING,
              enum: ['celsius', 'fahrenheit'],
            },
          },
          required: ['location'],
        },
      },
    ],
  },
]

const functionResponseParts = [
  {
    functionResponse: {
      name: 'get_current_weather',
      response: { name: 'get_current_weather', content: { weather: 'super nice' } },
    },
  },
]

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
  try {
    const chat = previewGenerationModel.startChat()
    const chatInput = 'capital of France?'
    const result = await chat.sendMessage(chatInput)
    const response = result.response
    console.log('response: ', JSON.stringify(response))
  } catch (error) {
    console.error('Error: ', error)
  }
}

export const basicVertexAIStartChatStream = async (): Promise<void> => {
  const chat = generativeModel.startChat()
  const chatInput = 'How can I learn more about Node.js?'
  const result = await chat.sendMessageStream(chatInput)
  for await (const item of result.stream) {
    const text = item.candidates?.[0]?.content?.parts?.[0]?.text
    if (text === undefined || text === null) {
      console.log('Stream chunk: No text available')
    } else {
      console.log('Stream chunk: ', text)
    }
  }
  const aggregatedResponse = await result.response
  console.log('Aggregated response: ', JSON.stringify(aggregatedResponse))
}

export const basicVertexAIStartChatWithToolRequest = async (): Promise<void> => {
  const request = {
    contents: [
      { role: 'user', parts: [{ text: 'What is the weather in Boston?' }] },
      { role: 'model', parts: [{ functionCall: { name: 'get_current_weather', args: { location: 'Boston' } } }] },
      { role: 'user', parts: functionResponseParts },
    ],
    tools: functionDeclarations,
  }
  const streamingResult = await generativeModel.generateContentStream(request)
  for await (const item of streamingResult.stream) {
    if (item?.candidates !== undefined) {
      console.log(item.candidates[0])
    }
  }
}

export const basicVertexAIStartChatWithToolResponse = async (): Promise<void> => {
  // Create a chat session and pass your function declarations
  const chat = generativeModel.startChat({ tools: functionDeclarations })

  const chatInput1 = 'What is the weather in Boston?'

  // This should include a functionCall response from the model
  const streamingResult1 = await chat.sendMessageStream(chatInput1)
  for await (const item of streamingResult1.stream) {
    if (item?.candidates !== undefined) {
      console.log(item.candidates[0])
    }
  }
  const response1 = await streamingResult1.response
  console.log('first aggregated response: ', JSON.stringify(response1))

  // Send a follow up message with a FunctionResponse
  const streamingResult2 = await chat.sendMessageStream(functionResponseParts)
  for await (const item of streamingResult2.stream) {
    if (item?.candidates !== undefined) {
      console.log(item.candidates[0])
    }
  }

  // This should include a text response from the model using the response content
  // provided above
  const response2 = await streamingResult2.response
  console.log('second aggregated response: ', JSON.stringify(response2))
}
