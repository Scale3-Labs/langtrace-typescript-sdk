/*
 * Copyright (c) 2025 Scale3 Labs
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
import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message
} from '@aws-sdk/client-bedrock-runtime'
import dotenv from 'dotenv'

dotenv.config()

init({ batch: false, write_spans_to_console: false, disable_instrumentations: { all_except: ['anthropic'] } })

const client = new BedrockRuntimeClient({ region: 'us-east-1' })

const userMessage =
  'Describe the purpose of a hello world program in one line.'
const conversation: Message[] = [
  {
    role: 'user',
    content: [{ text: userMessage }]
  }
]

const modelId = 'mistral.mistral-large-2402-v1:0'

export async function basic (): Promise<void> {
  // Create a command with the model ID, the message, and a basic configuration.
  const command = new ConverseCommand({
    modelId,
    messages: conversation,
    inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 }
  })

  try {
    // Send the command to the model and wait for the response
    const response = await client.send(command)

    // Extract and print the response text.
    const responseText = ((response.output?.message?.content?.length) != null) && response.output.message.content[0].text
    console.log(responseText)
  } catch (err) {
    console.log(`ERROR using '${modelId}'. Reason: ${err}`)
    process.exit(1)
  }
}
