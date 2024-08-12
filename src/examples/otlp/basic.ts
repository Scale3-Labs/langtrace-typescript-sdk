import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { init } from '@langtrace-init/init'
import OpenAI from 'openai'

init({
  //   write_spans_to_console: true,
  custom_remote_exporter: new OTLPTraceExporter({
    url: process.env.LANGTRACE_API_HOST,
    headers: { 'x-api-key': process.env.LANGTRACE_API_KEY }
  })
})

const openai = new OpenAI()

export async function example (): Promise<void> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'How many states of matter are there?'
      }
    ]
  })
  console.log(completion.choices[0])
}
