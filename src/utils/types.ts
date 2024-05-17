
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
export interface LangtracePrompt {
  id: string
  value: string
  variables: string[]
  model: string
  modelSettings: Record<string, unknown>
  version: number
  live: boolean
  tags: string[]
  note: string
  promptsetId: string
  createdAt: string
  updatedAt: string
}

export interface EvaluationAPIData {
  spanId: string
  traceId: string
  userId: string
  userScore: number
}

export interface LangTraceEvaluation {
  id: string
  spanId: string
  traceId: string
  userId: string
  userScore: number
  ltUserScore: number
  ltUserId: string
  createdAt: string
  updatedAt: string
}

export class LangTraceApiError extends Error {
  constructor (public message: string, public status: number) {
    super(message)
    this.message = message
    this.status = status
  }
}
