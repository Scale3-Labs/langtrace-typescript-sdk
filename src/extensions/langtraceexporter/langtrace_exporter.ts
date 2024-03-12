import { LANGTRACE_API } from '@langtrace-constants/exporter/langtrace_exporter'
import { ExportResult } from '@langtrace-extensions/langtraceexporter/types'
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base'
import axios from 'axios'

export class LangTraceExporter implements SpanExporter {
  private readonly apiKey?: string
  private readonly url?: string
  private readonly write_to_remote_url?: boolean

  /**
   *
   * @param apiKey Your API key. If not set, the value will be read from the LANGTRACE_API_KEY environment variable
   * @param url The endpoint to send the spans to. If not set, the value will be read from the LANGTRACE_URL environment variable
   * @param write_to_remote_url If true, spans will be sent to the remote URL. The url parameter must be set if this is true.
   */
  constructor (apiKey?: string, url?: string, write_to_remote_url?: boolean) {
    this.apiKey = apiKey ?? process.env.LANGTRACE_API_KEY
    this.url = url ?? process.env.LANGTRACE_URL
    this.write_to_remote_url = write_to_remote_url
    if (this.write_to_remote_url === true && this.url === undefined) {
      throw new Error('No URL provided')
    }
    if (this.write_to_remote_url === true && this.apiKey === undefined) {
      throw new Error('No API key provided')
    }
  }

  export (spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const data: Array<Partial<ReadableSpan>> = spans.map((span) => ({
      traceId: span.spanContext().traceId,
      name: span.name,
      startTime: span.startTime,
      endTime: span.endTime,
      attributes: span.attributes,
      kind: span.kind,
      status: span.status,
      events: span.events,
      resource: span.resource,
      links: span.links,
      parentSpanId: span.parentSpanId,
      instrumentationLibrary: span.instrumentationLibrary,
      duration: span.duration,
      droppedEventsCount: span.droppedEventsCount,
      droppedAttributesCount: span.droppedAttributesCount,
      droppedLinksCount: span.droppedLinksCount,
      ended: span.ended
    }))

    if (this.write_to_remote_url === false) {
      resultCallback({ code: 0 })
      return
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (this.url?.includes(LANGTRACE_API) === true && this.apiKey !== undefined) {
      headers['x-api-key'] = this.apiKey
    }
    axios.post(this.url!, data, { headers }).then((response) => {
      resultCallback({ code: response.status === 200 ? 0 : 1 })
    })
      .catch((error) => {
        resultCallback({ code: 1, error: error.response?.data })
      })
  }

  async shutdown (): Promise<void> {
    // Nothing to do
    return await Promise.resolve()
  }
}
