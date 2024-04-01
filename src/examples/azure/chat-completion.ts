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

// Initialize dotenv
import { init } from '@langtrace-init/init'
import dotenv from 'dotenv'
import OpenAI from 'openai'
dotenv.config()

init()

export async function azureChatCompletion (): Promise<void> {
  const openai = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_API_ENDPOINT}${process.env.AZURE_OPENAI_GPT_DEPLOYMENT_NAME}`,
    defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
  })
  const completion = await openai.chat.completions.create({
    model: process.env.AZURE_OPENAI_GPT_DEPLOYMENT_NAME as string,
    messages: [
      { role: 'user', content: 'Say this is a test 3 times' },
      {
        role: 'assistant',
        content: 'This is a test. This is a test. This is a test.'
      },
      { role: 'user', content: 'Say this is a mock 4 times' }
    ]
  })

  console.info(completion.choices[0])
}
