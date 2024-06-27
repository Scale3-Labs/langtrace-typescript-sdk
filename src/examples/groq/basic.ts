import { init } from '@langtrace-init/init'
import Groq from 'groq-sdk'
init({ write_spans_to_console: true, disable_instrumentations: { all_except: ['groq'] } })
const groq = new Groq()
export const chatCompletion = async (): Promise<void> => {
  const chatCompletion = await groq.chat.completions.create({

    messages: [{ role: 'user', content: 'Explain the importance of low latency LLMs' }],
    stream: true,
    model: 'mixtral-8x7b-32768'
  }, { timeout: 1000 })
  for await (const chunk of chatCompletion) {
    // process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
  }
  // console.info(chatCompletion.choices[0])
}
