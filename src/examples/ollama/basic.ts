
import { init } from '@langtrace-init/init'
import ollama from 'ollama'

init({ write_spans_to_console: true })
export const chatNonStreamed = async (): Promise<void> => {
  const response = await ollama.chat({
    model: 'llama3',
    messages: [{ role: 'user', content: 'How are you' }],
    stream: false
  })
  console.info(response)
}

export const chatStreamed = async (): Promise<void> => {
  const response = await ollama.chat({
    model: 'llama3',
    messages: [{ role: 'user', content: 'How are you' }],
    stream: true
  })
  for await (const message of response) {
    console.info(message.message)
  }
}

export const generateNonStreamed = async (): Promise<void> => {
  const response = await ollama.generate({
    model: 'llama3',
    prompt: 'How are you',
    system: 'You are a assistant that talks about anything',
    format: 'json'
  })
  console.info(response)
}

export const generateStreamed = async (): Promise<void> => {
  const response = await ollama.generate({
    model: 'llama3',
    prompt: 'How are you',
    system: 'You are a assistant that talks about anything',
    format: 'json',
    stream: true
  })
  for await (const message of response) {
    console.info(message.response)
  }
}

export const generateEmbedding = async (): Promise<void> => {
  const response = await ollama.embeddings({
    model: 'llama3',
    prompt: 'How are you',
    keep_alive: 1,
    options: {
      embedding_only: true,
      frequency_penalty: 0.5
    }
  })
  console.info(response)
}
