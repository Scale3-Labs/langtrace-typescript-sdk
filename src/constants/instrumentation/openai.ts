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
  CHAT_COMPLETION: {
    METHOD: 'openai.chat.completion',
    ENDPOINT: '/chat/completions'
  },
  IMAGES_GENERATION: {
    METHOD: 'openai.images.generate',
    ENDPOINT: '/images/generations'
  },
  IMAGES_EDIT: {
    METHOD: 'openai.images.edit',
    ENDPOINT: '/images/edits'
  },
  EMBEDDINGS_CREATE: {
    METHOD: 'openai.embeddings.create',
    ENDPOINT: '/embeddings'
  }
} as const
export type OpenAIFunctions = typeof APIS[keyof typeof APIS]['METHOD']
export const OpenAIFunctionNames: OpenAIFunctions[] = Object.values(APIS).map((api) => api.METHOD)
