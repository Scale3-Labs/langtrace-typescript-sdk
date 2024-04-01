/*
 * Copyright (c) 2024 Scale3 Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LANGTRACE_REMOTE_URL } from '@langtrace-constants/exporter/langtrace_exporter'
import { ExportResult } from '@langtrace-extensions/langtraceexporter/types'
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base'
import axios from 'axios'

export class LangTraceExporter implements SpanExporter {
  private readonly apiKey?: string
  private readonly write_to_langtrace_cloud?: boolean

  /**
   *
   * @param apiKey Your API key. If not set, the value will be read from the LANGTRACE_API_KEY environment variable
   * @param write_to_langtrace_cloud If true, spans will be sent to the langtrace cloud
   */
  constructor (apiKey?: string, write_to_langtrace_cloud?: boolean) {
    this.apiKey = apiKey ?? process.env.LANGTRACE_API_KEY
    this.write_to_langtrace_cloud = write_to_langtrace_cloud

    if (this.write_to_langtrace_cloud === true && this.apiKey === undefined) {
      throw new Error('No LangTrace API key provided')
    }
  }

  async export (spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): Promise<void> {
    const data: Array<Partial<ReadableSpan>> = spans.map((span) => ({
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      traceState: span.spanContext().traceState?.serialize(),
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

    if (this.write_to_langtrace_cloud === false) {
      resultCallback({ code: 0 })
      return
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'LangTraceExporter',
      'x-api-key': this.apiKey!
    }

    await axios.post(LANGTRACE_REMOTE_URL, data, { headers }).then((response) => {
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
