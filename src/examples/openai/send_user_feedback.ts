// Initialize dotenv
import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
import { sendUserFeedback } from '@langtrace-utils/langtrace'
import dotenv from 'dotenv'
import OpenAI from 'openai'
dotenv.config()

// Initialize Langtrace SDK
init()

const openai = new OpenAI()

// Function to handle OpenAI interaction and user feedback
export const run = async (): Promise<void> => {
  await withLangTraceRootSpan(async (spanId, traceId) => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Talk like a pirate' },
        { role: 'user', content: 'Tell me a story in 3 sentences or less.' }
      ],
      stream: false
    })

    console.info(response, spanId, traceId)
    // Send traceId and spanId to your client
    // Collect user feedback (This is likely going to be another route in your application) For this example, we are sending the feedback immediately after the interaction
    const userScore = 5 // Example user score
    const userId = 'user123' // Example user ID
    await sendUserFeedback({ spanId, traceId, userScore, userId })
  })
}
