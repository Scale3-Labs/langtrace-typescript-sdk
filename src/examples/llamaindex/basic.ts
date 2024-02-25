import { setupInstrumentation } from "../setup";

setupInstrumentation();

// import * as traceloop from "@traceloop/node-server-sdk";

// traceloop.initialize({
//   disableBatch: true,
//   apiKey:
//     "6388e4ca99cb28c69034aacde1cd85f588657c195298200cf2e34e25c5ec537ffd0f94cfeff57446414ebe6c9c60efa5",
// });

import dotenv from "dotenv";
import fs from "fs/promises";
import type { BaseReader, Metadata } from "llamaindex";
import {
  Document,
  IngestionPipeline,
  QuestionsAnsweredExtractor,
  TitleExtractor,
  VectorStoreIndex,
} from "llamaindex";
import {
  FILE_EXT_TO_READER,
  SimpleDirectoryReader,
  TextFileReader,
} from "llamaindex/readers/SimpleDirectoryReader";
import withLangTraceRootSpan from "../../instrumentation/with-root-span";
dotenv.config();

export async function basic() {
  withLangTraceRootSpan(async () => {
    // Load essay from abramov.txt in Node
    const path = "node_modules/llamaindex/examples/abramov.txt";

    const essay = await fs.readFile(path, "utf-8");

    // Create Document object with essay
    const document = new Document({ text: essay, id_: path });

    // Split text and create embeddings. Store them in a VectorStoreIndex
    const index = await VectorStoreIndex.fromDocuments([document]);

    // Query the index
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({
      query: "What did the author do in college?",
    });

    // Output response
    console.log(response.toString());
  });
}

export async function extractor() {
  const pipeline = new IngestionPipeline({
    transformations: [
      new TitleExtractor(),
      new QuestionsAnsweredExtractor({
        questions: 5,
      }),
    ],
  });

  const nodes = await pipeline.run({
    documents: [
      new Document({ text: "I am 10 years old. John is 20 years old." }),
    ],
  });

  for (const node of nodes) {
    console.log(node.metadata);
  }
}

export async function loader() {
  class ZipReader implements BaseReader {
    loadData(...args: any[]): Promise<Document<Metadata>[]> {
      throw new Error("Implement me");
    }
  }

  const reader = new SimpleDirectoryReader();
  const documents = await reader.loadData({
    directoryPath: "src/examples/llamaindex/data",
    defaultReader: new TextFileReader(),
    fileExtToReader: {
      ...FILE_EXT_TO_READER,
      zip: new ZipReader(),
    },
  });

  documents.forEach((doc) => {
    console.log(`document (${doc.id_}):`, doc.getText());
  });
}
