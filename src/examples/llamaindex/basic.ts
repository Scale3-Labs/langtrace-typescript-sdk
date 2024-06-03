import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import type { BaseReader, Metadata } from 'llamaindex'
import {
  Document,
  FILE_EXT_TO_READER,
  IngestionPipeline,
  QuestionsAnsweredExtractor,
  SimpleDirectoryReader,
  TextFileReader,
  TitleExtractor,
  VectorStoreIndex
} from 'llamaindex'
dotenv.config()

init({
  batch: false,
  write_spans_to_console: true,
  disable_instrumentations: { all_except: ['llamaindex', 'openai'] }
})

export async function basic (): Promise<void> {
  // await withLangTraceRootSpan(async (spanId, traceId) => {
  // Load essay from abramov.txt in Node
  // const path = 'node_modules/llamaindex/examples/abramov.txt'

  // const essay = await fs.readFile(path, 'utf-8')

  // // Create Document object with essay
  const document = new Document({ text: "Author of 'React' and 'Redux' books. He is a software engineer at Facebook. He studied at the University of Moscow and studied engineering" })

  // // Split text and create embeddings. Store them in a VectorStoreIndex
  const index = await VectorStoreIndex.fromDocuments([document])

  // Query the index
  const queryEngine = index.asQueryEngine()
  const response = await queryEngine.query({ query: 'What did the author do in college?' })
  // Output response
  console.info(response.toString())
  // })
}

export async function extractor (): Promise<void> {
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

  for (const node of nodes) {
    console.info(node.metadata)
  }
}

export async function loader (): Promise<void> {
  class ZipReader implements BaseReader {
    // eslint-disable-next-line @typescript-eslint/require-await
    async loadData (): Promise<Array<Document<Metadata>>> {
      throw new Error('Implement me')
    }
  }

  const reader = new SimpleDirectoryReader()
  const documents = await reader.loadData({
    directoryPath: 'src/examples/llamaindex/data',
    defaultReader: new TextFileReader(),
    fileExtToReader: {
      ...FILE_EXT_TO_READER,
      zip: new ZipReader()
    }
  })

  documents.forEach((doc) => {
    console.info(`document (${doc.id_}):`, doc.getText())
  })
}
