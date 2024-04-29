import { Tracer, context } from '@opentelemetry/api'
import { ChatFn, IChatCompletionCreateParamsNonStreaming, IChatCompletionResponse, IRequestOptions } from '@langtrace-instrumentation/groq/types'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { APIS } from '@langtrace-constants/instrumentation/groq'
import { LLMSpanAttributes } from '@langtrase/trace-attributes'

export const chatPatch = (original: ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: any, body: IChatCompletionCreateParamsNonStreaming, options?: IRequestOptions): Promise<IChatCompletionResponse> {
    // Determine the service provider
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'groq',
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?._client?.baseURL,
      'llm.api': APIS.CHAT_COMPLETION.METHOD,
      'llm.model': body.model,
      'http.max.retries': options?.maxRetries ?? this._client.maxRetries,
      'http.timeout': options?.timeout ?? this._client.timeout,
      'llm.stream': options?.stream ?? false,
      ...customAttributes
    }
    return await original.apply(this, [body, options])
  }
}
