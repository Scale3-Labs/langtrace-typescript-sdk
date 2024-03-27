// Initialize dotenv
import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'
import OpenAI from 'openai'
dotenv.config()

init({
  write_to_remote_url: false,
  batch: false
})

export async function chatCompletion (): Promise<void> {
  const openai = new OpenAI()

  await withLangTraceRootSpan(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Say this is a test 3 times' }
        // {
        //   role: "assistant",
        //   content: "This is a test. This is a test. This is a test.",
        // },
        // { role: "user", content: "Say this is a mock 4 times" },
      ],
      stream: true
    })

    // console.info(response)

    for await (const part of response) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
      process.stdout.write(part.choices[0]?.delta?.content || '')
    }

    // const completion2 = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     { role: "user", content: "Say this is a test 3 times" },
    //     {
    //       role: "assistant",
    //       content: "This is a test. This is a test. This is a test.",
    //     },
    //     { role: "user", content: "Say this is a mock 4 times" },
    //   ],
    // });
  })
}
