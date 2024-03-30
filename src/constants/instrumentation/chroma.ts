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

import { ChromaDBMethods } from '@langtrase/trace-attributes'

export const APIS: Record<string, { METHOD: string, OPERATION: string }> = {
  ADD: {
    METHOD: ChromaDBMethods.ADD,
    OPERATION: 'add'
  },
  QUERY: {
    METHOD: ChromaDBMethods.QUERY,
    OPERATION: 'query'
  },
  DELETE: {
    METHOD: ChromaDBMethods.DELETE,
    OPERATION: 'delete'
  },
  PEEK: {
    METHOD: ChromaDBMethods.PEEK,
    OPERATION: 'peek'
  },
  UPDATE: {
    METHOD: ChromaDBMethods.UPDATE,
    OPERATION: 'update'
  },
  MODIFY: {
    METHOD: ChromaDBMethods.MODIFY,
    OPERATION: 'modify'
  },
  COUNT: {
    METHOD: ChromaDBMethods.COUNT,
    OPERATION: 'count'
  }
}
