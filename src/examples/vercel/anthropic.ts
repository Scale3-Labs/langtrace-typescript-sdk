import { createAnthropic } from '@ai-sdk/anthropic'
import { init } from '@langtrace-init/init'
import { z } from 'zod'

import ai from '@langtrace-module-wrappers/ai'
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

init({ write_spans_to_console: true, instrumentations: { ai }, batch: false })

export async function basicGenerateTextAnthropic (): Promise<void> {
  const { text } = await ai.generateText({
    model: anthropic('claude-3-haiku-20240307'),
    prompt: 'Say hello 1 time'
  })
  console.log(text)
}

export async function basicStreamTextAnthropic (): Promise<void> {
  const result = await ai.streamText({
    model: anthropic('claude-3-haiku-20240307'),
    prompt: 'Say hi twice.'
  })

  for await (const message of result.textStream) {
    process.stdout.write(message as string)
  }
}

export async function basicGenerateObjectAnthropic (): Promise<void> {
  const { object } = await ai.generateObject({
    model: anthropic('claude-3-haiku-20240307'),
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(
          z.object({ name: z.string(), amount: z.string() })
        ),
        steps: z.array(z.string())
      })
    }),
    prompt: 'Generate a lasagna recipe.'
  })
  console.log(object)
}

export async function basicStreamObjectAnthropic (): Promise<void> {
  const { partialObjectStream } = await ai.streamObject({
    model: anthropic('claude-3-haiku-20240307'),
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(
          z.object({ name: z.string(), amount: z.string() })
        ),
        steps: z.array(z.string())
      })
    }),
    prompt: 'Say hi twice.'
  })

  for await (const partialObject of partialObjectStream) {
    console.log(partialObject)
  }
}
