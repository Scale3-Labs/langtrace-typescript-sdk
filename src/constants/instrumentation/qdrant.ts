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

import { QdrantDBMethods } from '@langtrase/trace-attributes'

export const APIS: Record<
string,
{ METHOD: string, OPERATION: string }
> = {
  GET_COLLECTION: {
    METHOD: QdrantDBMethods.GET_COLLECTION,
    OPERATION: 'getCollection'
  },
  GET_COLLECTIONS: {
    METHOD: QdrantDBMethods.GET_COLLECTIONS,
    OPERATION: 'getCollections'
  },
  DELETE: {
    METHOD: QdrantDBMethods.DELETE,
    OPERATION: 'delete'
  },
  DISCOVER: {
    METHOD: QdrantDBMethods.DISCOVER,
    OPERATION: 'discoverPoints'
  },
  DISCOVER_BATCH: {
    METHOD: QdrantDBMethods.DISCOVER_BATCH,
    OPERATION: 'discoverBatchPoints'
  },
  RECOMMEND: {
    METHOD: QdrantDBMethods.RECOMMEND,
    OPERATION: 'recommend'
  },
  RECOMMEND_BATCH: {
    METHOD: QdrantDBMethods.RECOMMEND_BATCH,
    OPERATION: 'recommendBatch'
  },
  RETRIEVE: {
    METHOD: QdrantDBMethods.RETRIEVE,
    OPERATION: 'retrieve'
  },
  SEARCH: {
    METHOD: QdrantDBMethods.SEARCH,
    OPERATION: 'search'
  },
  SEARCH_BATCH: {
    METHOD: QdrantDBMethods.SEARCH_BATCH,
    OPERATION: 'searchBatch'
  },
  UPSERT: {
    METHOD: QdrantDBMethods.UPSERT,
    OPERATION: 'upsert'
  },
  COUNT: {
    METHOD: QdrantDBMethods.COUNT,
    OPERATION: 'count'
  },
  UPDATE_COLLECTION: {
    METHOD: QdrantDBMethods.UPDATE_COLLECTION,
    OPERATION: 'updateCollection'
  },
  UPDATE_VECTORS: {
    METHOD: QdrantDBMethods.UPDATE_VECTORS,
    OPERATION: 'updateVectors'
  }
}
