import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import axios from 'axios';
import { ExportResult } from '@langtrace-extensions/langtraceexporter/types';

export class LangTraceExporter implements SpanExporter {
  private apiKey?: string;
  private url?: string;
  /**
   *
   * @param apiKey Your API key. If not set, the value will be read from the LANGTRACE_API_KEY environment variable
   * @param url The endpoint to send the spans to. If not set, the value will be read from the LANGTRACE_URL environment variable
   */
  constructor(apiKey?: string, url?: string) {
    this.apiKey = apiKey ?? process.env.LANGTRACE_API_KEY;
    this.url = url ??  process.env.LANGTRACE_URL;
    if(this.apiKey===undefined) {
      throw new Error('No API key provided');
    }
    if(this.url===undefined) {
      throw new Error('No URL provided');
    }
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void) {
    console.log('Exporting spans', spans.length);

    const data: Partial<ReadableSpan>[] = spans.map(span => ({
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
    }));

    axios.post(this.url!, data, {
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(response => {
      resultCallback({ code: response.status === 200 ? 0 : 1 });
    }).catch(error => {
      resultCallback({ code: 1, error: error.response?.data });
    });
  }

  shutdown() {
    //Nothing to do
    return Promise.resolve();
  }
}
