import { init } from '@langtrace-init/init'
import weaviate, { ObjectsBatcher } from 'weaviate-ts-client'
import dotenv from 'dotenv'

import fetch from 'node-fetch'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
dotenv.config()
init({ write_spans_to_console: true })

const client = weaviate.client({
  apiKey: { apiKey: process.env.WEAVIATE_API_KEY ?? '' },
  host: process.env.WEAVIATE_HOST ?? '',
  headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY ?? '' }
})
// Add the schema
const classObj = {
  class: 'Question',
  vectorizer: 'text2vec-openai', // If set to "none" you must always provide vectors yourself. Could be any other "text2vec-*" also.
  moduleConfig: {
    'text2vec-openai': {},
    'generative-openai': {} // Ensure the `generative-openai` module is used for generative queries
  }
}

async function addSchema (): Promise<void> {
  await client.schema.classDeleter().withClassName('Question').do().then(async (_) => {
    const res = await client.schema.classCreator().withClass(classObj).do()
    console.log(JSON.stringify(res, null, 2))
  })
}

// END Add the schema

// Import data function
async function getJsonData (): Promise<any> {
  const file = await fetch('https://raw.githubusercontent.com/weaviate-tutorials/quickstart/main/data/jeopardy_tiny.json')
  return await file.json()
}

async function importQuestions (): Promise<void> {
  // Get the questions directly from the URL
  const data = await getJsonData()

  // Prepare a batcher
  let batcher: ObjectsBatcher = client.batch.objectsBatcher()
  let counter = 0
  const batchSize = 100

  for (const question of data) {
    // Construct an object with a class and properties 'answer' and 'question'
    const obj = {
      class: 'Question',
      properties: {
        answer: question.Answer,
        question: question.Question,
        category: question.Category
      },
      moduleConfig: { 'text2vec-transformers': { vectorizeClassName: true } }
    }

    // add the object to the batch queue
    batcher = batcher.withObject(obj)

    // When the batch counter reaches batchSize, push the objects to Weaviate
    if (counter++ === batchSize) {
      // flush the batch queue
      await batcher.do()

      // restart the batch queue
      counter = 0
      batcher = client.batch.objectsBatcher()
    }
  }

  // Flush the remaining objects
  await batcher.do()
}

export async function basic (): Promise<void> {
  await withLangTraceRootSpan(async () => {
    await addSchema()
    await importQuestions()
    await nearTextQueryAggregate()
    await nearTextWhereQueryWithFilter()
    await nearTextQueryRaw()
  })
}

async function nearTextQueryRaw (): Promise<any> {
  const res = await client.graphql
    .raw()
    .withQuery('query { Get { Question { answer } } }')
    .do()

  console.log(JSON.stringify(res, null, 2))
  return res
}

async function nearTextQueryAggregate (): Promise<any> {
  const res = await client.graphql
    .aggregate()
    .withClassName('Question')
    .withFields('category { count }')
    .withLimit(2)
    .do()

  console.log(JSON.stringify(res, null, 2))
  return res
}
async function nearTextWhereQueryWithFilter (): Promise<any> {
  const res = await client.graphql
    .get()
    .withClassName('Question')
    .withFields('question answer category')
    .withNearText({ concepts: ['biology'] })
    .withWhere({
      path: ['category'],
      operator: 'Equal',
      valueText: 'ANIMALS'
    })
    .withLimit(2)
    .do()

  console.log(JSON.stringify(res, null, 2))
  return res
}
