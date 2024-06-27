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

import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'

import Anthropic from '@anthropic-ai/sdk'
dotenv.config()

init({ batch: false, write_spans_to_console: true, disable_instrumentations: { all_except: ['anthropic'] } })

const anthropic = new Anthropic()

export async function basic (): Promise<void> {
  await withLangTraceRootSpan(async () => {
    const message = await anthropic.messages.create({
      max_tokens: 1024,
      temperature: 0.5,
      system: 'respond like a cat',
      messages: [{ role: 'user', content: 'Hello, Claude' }],
      model: 'claude-3-opus-20240229',
      stream: false,
      metadata: { user_id: '1234' }
    })

    console.info(message.content)
    // for await (const part of message) {
    //   // console.info(part)
    // }
  })
}
