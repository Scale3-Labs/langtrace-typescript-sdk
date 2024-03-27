import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'

import Anthropic from '@anthropic-ai/sdk'
dotenv.config()

init({
  batch: false,
  write_to_remote_url: false
})

const anthropic = new Anthropic()

export async function basic (): Promise<void> {
  await withLangTraceRootSpan(async () => {
    const message = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello, Claude' }],
      model: 'claude-3-opus-20240229',
      stream: true
    })

    // console.info(message.content)
    for await (const part of message) {
      console.info(part)
    }
  })
}
