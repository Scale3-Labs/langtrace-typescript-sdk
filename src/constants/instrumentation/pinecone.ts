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

import { PineconeMethods } from '@langtrase/trace-attributes'

export const APIS: Record<
string,
{ METHOD: string, ENDPOINT: string, OPERATION: string }
> = {
  UPSERT: {
    METHOD: PineconeMethods.UPSERT,
    ENDPOINT: '/vectors/upsert',
    OPERATION: 'upsert'
  },
  QUERY: {
    METHOD: PineconeMethods.QUERY,
    ENDPOINT: '/query',
    OPERATION: 'query'
  },
  DELETE_ONE: {
    METHOD: PineconeMethods.DELETE_ONE,
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteOne'
  },
  DELETE_MANY: {
    METHOD: PineconeMethods.DELETE_MANY,
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteMany'
  },
  DELETE_ALL: {
    METHOD: PineconeMethods.DELETE_ALL,
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteAll'
  }
}
