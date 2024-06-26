import { init } from '@langtrace-init/init'
import * as cohere from 'cohere-ai'
import { Tool } from 'cohere-ai/api'
import fs from 'fs'

init({ disable_instrumentations: { all_except: ['cohere'] }, write_spans_to_console: true })

const c = new cohere.CohereClient()
export const basicChat = async (): Promise<void> => {
  const prediction = await c.chat({
    chatHistory: [
      { role: 'USER', message: 'Who discovered gravity?' },
      { role: 'CHATBOT', message: 'The man who is widely credited with discovering gravity is Sir Isaac Newton' }
    ],
    message: 'What year was he born?',
    connectors: [{ id: 'web-search' }]

  })
  // console.info('Received prediction', prediction)
}
export const basicAgent = async (): Promise<void> => {
  const tools: Tool[] = [
    {
      name: 'query_daily_sales_report',
      description: 'Connects to a database to retrieve overall sales volumes and sales information for a given day.',
      parameterDefinitions: {
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
      parameterDefinitions: {
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
  const toolResults = [
    {
      outputs: [
        {
          sales_summary: {
            total_sales: 123456,
            total_customers: 1234,
            total_orders: 12345
          }
        }
      ],
      call: {
        name: 'query_daily_sales_report',
        parameters: { day: '2023-09-29' }
      }
    }
  ]
  await c.chat({
    message: 'Can you provide a sales summary for 29th September 2023. And tell me a story in 5 parts!',
    tools,
    toolResults,
    preamble,
    model: 'command-r'
  }
  )
}

export const basicStream = async (): Promise<void> => {
  const stream = await c.chatStream({
    model: 'command',
    message: 'Tell me a two letter word!',
    k: 1
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

export const basicEmbedJobsCreate = async (): Promise<void> => {
  const s = await c.datasets.list()
  if (s.datasets === undefined) {
    const f = fs.createReadStream('src/examples/cohere/data.csv')
    const resp = await c.datasets.create(f, undefined, { name: 'dataset-123', type: 'embed-input' })
    if (resp.id !== undefined) {
      const embed = await c.embedJobs.create({
        datasetId: resp.id,
        name: 'Embedding job',
        model: 'embed-english-v3.0',
        inputType: 'classification',
        embeddingTypes: ['float', 'int8']
      })
      console.info('Received embed', embed)
    }
  } else {
    const embed = await c.embedJobs.create({
      datasetId: s.datasets[0]!.id,
      name: 'Embedding job',
      model: 'embed-english-v3.0',
      inputType: 'classification',
      embeddingTypes: ['float', 'int8']
    })
    console.info('Received embed', embed)
  }
}

export const basicRerank = async (): Promise<void> => {
  const rerank = await c.rerank({
    documents: [
      { text: 'Carson City is the capital city of the American state of Nevada.' },
      { text: 'The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.' },
      { text: 'Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.' },
      { text: 'Capital punishment (the death penalty) has existed in the United States since beforethe United States was a country. As of 2017, capital punishment is legal in 30 of the 50 states.' }
    ],
    query: 'What is the capital of the United States?',
    topN: 3
  })

  console.info('Received rerank', rerank)
}
