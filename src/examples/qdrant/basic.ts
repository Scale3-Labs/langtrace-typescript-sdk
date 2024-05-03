import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import { QdrantClient } from '@qdrant/js-client-rest'

const qclient = new QdrantClient({ url: 'http://127.0.0.1:6333' })

init({ write_to_langtrace_cloud: false, disable_instrumentations: { all_except: ['qdrant'] } })

export async function basic (): Promise<void> {
  await withLangTraceRootSpan(async () => {
    /**
     * Need to run qdrant locally using docker.
     * 1. docker pull qdrant/qdrant
     * 2. docker run -p 6333:6333 -p 6334:6334 \
          -v $(pwd)/qdrant_storage:/qdrant/storage:z \
          qdrant/qdrant
    **/

    const collectionName = 'MyCollection4'
    await qclient.createCollection(collectionName, { vectors: { size: 4, distance: 'Dot' } })

    await qclient.upsert(collectionName, {
      wait: true,
      points: [
        { id: 1, vector: [0.05, 0.61, 0.76, 0.74], payload: { city: 'Berlin' } },
        { id: 2, vector: [0.19, 0.81, 0.75, 0.11], payload: { city: 'London' } },
        { id: 3, vector: [0.36, 0.55, 0.47, 0.94], payload: { city: 'Moscow' } },
        { id: 4, vector: [0.18, 0.01, 0.85, 0.80], payload: { city: 'New York' } },
        { id: 5, vector: [0.24, 0.18, 0.22, 0.44], payload: { city: 'Beijing' } },
        { id: 6, vector: [0.35, 0.08, 0.11, 0.44], payload: { city: 'Mumbai' } }
      ]
    })

    const searchResult = await qclient.search(collectionName, {
      vector: [0.2, 0.1, 0.9, 0.7],
      limit: 3
    })

    return searchResult
  })
}
