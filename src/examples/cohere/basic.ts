import { init } from '@langtrace-init/init'
import * as cohere from 'cohere-ai'

init({ write_to_langtrace_cloud: false })
const c = new cohere.CohereClient({ token: 'bGFkbVRVgNGI0T4Y24AVo6F6sR8KsMej4vYHOmdz' })

export const basicChat = async (): Promise<void> => {
  const prediction = await c.chat({
    chatHistory: [
      { role: 'USER', message: 'Who discovered gravity?' },
      { role: 'CHATBOT', message: 'The man who is widely credited with discovering gravity is Sir Isaac Newton' }
    ],
    message: 'What year was he born?',
    connectors: [{ id: 'web-search' }]

  })
  console.info('Received prediction', prediction)
}
export const basicAgent = async (): Promise<void> => {
  const tools = [
    {
      name: 'query_daily_sales_report',
      description: 'Connects to a database to retrieve overall sales volumes and sales information for a given day.',
      parameter_definitions: {
        day: {
          description: 'Retrieves sales data for this day, formatted as YYYY-MM-DD.',
          type: 'str',
          required: true
        }
      }
    },
    {
      name: 'query_product_catalog',
      description: 'Connects to a a product catalog with information about all the products being sold, including categories, prices, and stock levels.',
      parameter_definitions: {
        category: {
          description: 'Retrieves product information data for all products in this category.',
          type: 'str',
          required: true
        }
      }
    }
  ]

  const preamble = `
You help people answer their questions and other requests interactively.
You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. 
You should focus on serving the user's needs as best you can, which will be wide-ranging.
Unless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.
`

  const stream = await c.chatStream({
    message: 'Can you provide a sales summary for 29th September 2023. And tell me a story in 5 parts!',
    tools,
    preamble,
    model: 'command-r'
  }
  )
  const responses = []
  for await (const chat of stream) {
    responses.push(chat)
    if (chat.eventType === 'text-generation') {
      process.stdout.write(chat.text)
    }
  }
  console.info('Received response', responses[responses.length - 1])
}

export const basicStream = async (): Promise<void> => {
  const stream = await c.chatStream({
    model: 'command',
    message: 'Tell me a two letter word!'
  })
  const responses = []
  for await (const chat of stream) {
    responses.push(chat)
    if (chat.eventType === 'text-generation') {
      process.stdout.write(chat.text)
    }
  }
}

export const basicEmbed = async (): Promise<void> => {
  const embed = await c.embed({
    texts: ['hello', 'goodbye'],
    model: 'embed-english-v3.0',
    inputType: 'classification',
    embeddingTypes: ['float', 'int8']
  })
  console.info(embed)

  console.info('Received embed', embed)
}
