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
  UPSERT: {
    METHOD: 'pinecone.index.upsert',
    ENDPOINT: '/vectors/upsert',
    OPERATION: 'upsert'
  },
  QUERY: {
    METHOD: 'pinecone.index.query',
    ENDPOINT: '/query',
    OPERATION: 'query'
  },
  DELETE_ONE: {
    METHOD: 'pinecone.index.deleteOne',
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteOne'
  },
  DELETE_MANY: {
    METHOD: 'pinecone.index.deleteMany',
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteMany'
  },
  DELETE_ALL: {
    METHOD: 'pinecone.index.deleteAll',
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteAll'
  }
} as const

export type PineConeFunctions = typeof APIS[keyof typeof APIS]['METHOD']
export const PineConeFunctionNames: PineConeFunctions[] = Object.values(APIS).map((api) => api.METHOD)
