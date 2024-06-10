/*
 * Copyright (c) 2024 Scale3 Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const APIS = {
  GET_COLLECTION: {
    METHOD: 'qdrantdb.get_collection',
    OPERATION: 'getCollection'
  },
  GET_COLLECTIONS: {
    METHOD: 'qdrantdb.get_collections',
    OPERATION: 'getCollections'
  },
  DELETE: {
    METHOD: 'qdrantdb.delete',
    OPERATION: 'delete'
  },
  DISCOVER: {
    METHOD: 'qdrantdb.discover',
    OPERATION: 'discoverPoints'
  },
  DISCOVER_BATCH: {
    METHOD: 'qdrantdb.discover_batch',
    OPERATION: 'discoverBatchPoints'
  },
  RECOMMEND: {
    METHOD: 'qdrantdb.recommend',
    OPERATION: 'recommend'
  },
  RECOMMEND_BATCH: {
    METHOD: 'qdrantdb.recommend_batch',
    OPERATION: 'recommendBatch'
  },
  RETRIEVE: {
    METHOD: 'qdrantdb.retrieve',
    OPERATION: 'retrieve'
  },
  SEARCH: {
    METHOD: 'qdrantdb.search',
    OPERATION: 'search'
  },
  SEARCH_BATCH: {
    METHOD: 'qdrantdb.search_batch',
    OPERATION: 'searchBatch'
  },
  UPSERT: {
    METHOD: 'qdrantdb.upsert',
    OPERATION: 'upsert'
  },
  COUNT: {
    METHOD: 'qdrantdb.count',
    OPERATION: 'count'
  },
  UPDATE_COLLECTION: {
    METHOD: 'qdrantdb.update_collection',
    OPERATION: 'updateCollection'
  },
  UPDATE_VECTORS: {
    METHOD: 'qdrantdb.update_vectors',
    OPERATION: 'updateVectors'
  }
} as const

export type QdrantFunctions = typeof APIS[keyof typeof APIS]['METHOD']
export const QdrantFunctionNames: QdrantFunctions[] = Object.values(APIS).map((api) => api.METHOD)
