
import { init } from '@langtrace-init/init'
import type { BaseReader, Metadata, NodeWithScore } from 'llamaindex'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'
import {
  CorrectnessEvaluator,
  Document,
  IngestionPipeline,
  QuestionsAnsweredExtractor,
  ResponseSynthesizer,
  TextNode,
  TitleExtractor,
  VectorStoreIndex,
  SentenceSplitter
} from 'llamaindex'
dotenv.config()

init({ batch: false, api_key: '986fd03796f14f6a1009f6a65866e39ae850cd14e1f7348260dfc04ef5ab38a7' })

// Initialize the root span to trace the operations
export async function basic (): Promise<void> {
  await withLangTraceRootSpan(async (spanId, traceId) => {
    // Step 1: Load documents using the loader function
    const documents = await loader()

    // Step 2: Split documents into sentences using SentenceSplitter before indexing
    const splitter = new SentenceSplitter({ chunkSize: 20 })
    const splitDocuments: Document[] = []

    for (const doc of documents) {
      const sentenceChunks = splitter.splitText(doc.text)
      console.info('Sentence Chunks:', sentenceChunks)
      sentenceChunks.forEach((chunk, index) => {
        splitDocuments.push(new Document({ text: chunk, metadata: { part: index + 1 } }))
      })
    }
    console.info('Split Documents:', splitDocuments)

    // Step 3: Create a VectorStoreIndex from the split documents
    const index = await VectorStoreIndex.fromDocuments(splitDocuments)

    // Step 4: Query the index using QueryEngine
    const queryEngine = index.asQueryEngine()
    const query = 'What did the author do in college?'
    const response = await queryEngine.query({ query })
    console.info('Query Response:', response.toString())

    // Step 5: Retrieve additional data using Retriever
    const retriever = index.asRetriever()
    const retrievedDocuments = await retriever.retrieve(query)
    console.info('Retrieved Documents:', retrievedDocuments)

    // Step 6: Evaluate the query response using CorrectnessEvaluator
    const evaluator = new CorrectnessEvaluator({})
    const evaluationResult = await evaluator.evaluateResponse({ query, response })
    const evaluationResult2 = await evaluator.evaluate({ query, response: response.response.toString() })
    console.info('Evaluation Result:', evaluationResult)
    console.info('Evaluation Result 2:', evaluationResult2)

    // Step 7: Run the ingestion pipeline with transformations
    const nodes = await runIngestionPipeline()
    console.info('Transformed Nodes:', nodes)

    // Step 8: Synthesize a response using the ResponseSynthesizer
    const responseSynthesizer = new ResponseSynthesizer()
    const nodesWithScore: NodeWithScore[] = [
      {
        node: new TextNode({ text: 'I am 10 years old.' }),
        score: 1
      },
      {
        node: new TextNode({ text: 'John is 20 years old.' }),
        score: 0.5
      }
    ]
    const synthesizeResponse = await responseSynthesizer.synthesize({
      query: 'What age am I?',
      nodesWithScore
    })
    console.info('Synthesized Response:', synthesizeResponse)
  })
}

// Ingestion pipeline to extract metadata and transform documents
export async function runIngestionPipeline (): Promise<Array<Document<Metadata>>> {
  const pipeline = new IngestionPipeline({
    transformations: [
      new TitleExtractor(),
      new QuestionsAnsweredExtractor({ questions: 5 })
    ]
  })

  const nodes = await pipeline.run({
    documents: [
      new Document({ text: 'I am 10 years old. John is 20 years old.' })
    ]
  })
  return nodes.map((node) => new Document(node))
}

// Loader function to read data
export async function loader (): Promise<Document[]> {
  class ZipReader implements BaseReader {
    // eslint-disable-next-line @typescript-eslint/require-await
    async loadData (): Promise<Array<Document<Metadata>>> {
      return await runIngestionPipeline()
    }
  }

  const reader = new ZipReader()
  const documents = await reader.loadData()

  return documents
}
