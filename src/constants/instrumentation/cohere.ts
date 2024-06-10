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
  CHAT: {
    METHOD: 'cohere.chat',
    ENDPOINT: '/v1/chat'
  },
  CHAT_STREAM: {
    METHOD: 'cohere.chatStream',
    ENDPOINT: '/v1/chat'
  },
  EMBED: {
    METHOD: 'cohere.embed',
    ENDPOINT: '/v1/embed'
  },
  EMBED_JOBS: {
    METHOD: 'cohere.embedJobs.create',
    ENDPOINT: '/v1/embed-jobs'
  },
  RERANK: {
    METHOD: 'cohere.rerank',
    ENDPOINT: '/v1/rerank'
  }
} as const

export type CohereFunctions = typeof APIS[keyof typeof APIS]['METHOD']
export const CohereFunctionNames: CohereFunctions[] = Object.values(APIS).map((api) => api.METHOD)
