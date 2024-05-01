import { init } from '@langtrace-init/init'
import Groq from 'groq-sdk'
init({ write_to_langtrace_cloud: false })
const groq = new Groq()
export const chatCompletion = async (): Promise<void> => {
  const chatCompletion = await groq.chat.completions.create({

    messages: [{ role: 'user', content: 'Explain the importance of low latency LLMs' }],
    stream: true,
    model: 'mixtral-8x7b-32768'
  }, { timeout: 1000 })
  for await (const chunk of chatCompletion) {
    // console.info(chunk.choices[0].delta.content)
  }
}