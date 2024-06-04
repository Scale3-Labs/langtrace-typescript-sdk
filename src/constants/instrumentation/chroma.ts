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

export const APIS: { [key: string]: { METHOD: string, OPERATION: string } } = {
  ADD: {
    METHOD: 'chromadb.collection.add',
    OPERATION: 'add'
  },
  QUERY: {
    METHOD: 'chromadb.collection.query',
    OPERATION: 'query'
  },
  DELETE: {
    METHOD: 'chromadb.collection.delete',
    OPERATION: 'delete'
  },
  PEEK: {
    METHOD: 'chromadb.collection.peek',
    OPERATION: 'peek'
  },
  UPDATE: {
    METHOD: 'chromadb.collection.update',
    OPERATION: 'update'
  },
  MODIFY: {
    METHOD: 'chromadb.collection.modify',
    OPERATION: 'modify'
  },
  COUNT: {
    METHOD: 'chromadb.collection.count',
    OPERATION: 'count'
  }
} as const

export type ChromaMethods = typeof APIS[keyof typeof APIS]['METHOD']
