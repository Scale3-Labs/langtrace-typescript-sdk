import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import dotenv from 'dotenv'
import * as http from 'http'
import OpenAI from 'openai'

dotenv.config()
init({ api_key: 'dbda4e119945be3e8e542225655484d1807b3b50268262da958c8a45efed3bc4', write_to_langtrace_cloud: true })

const hostname = '127.0.0.1'
const port = 3000
const openai = new OpenAI()

const server = http.createServer(async (req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(204) // No Content
    res.end()
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  await withLangTraceRootSpan(async () => {
    await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Say this is a test 3 times' },
        {
          role: 'assistant',
          content: 'This is a test. This is a test. This is a test.'
        },
        { role: 'user', content: 'Say this is a mock 4 times' }
      ]
    })
  }, 'chat-completion', undefined)
  console.info('here2')
  // console.log(completion.choices[0]);
  res.end('Hello World\n')
})
export const runSimpleServer = (): void => {
  server.listen(port, hostname, () => {
    console.info(`Server running at http://${hostname}:${port}/`)
  })
}
