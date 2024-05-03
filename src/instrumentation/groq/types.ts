
// Functions
export type ChatFn = (body: IChatCompletionCreateParamsNonStreaming, requestOptions?: IRequestOptions) => Promise<IChatCompletionResponse>
export type ChatStreamFn = (body: IChatCompletionCreateParamsStreaming, requestOptions?: IRequestOptions) => Promise<AsyncIterable<IChatCompletionResponseStreamed>>
export interface IRequestOptions<Req = any> {
  method?: HTTPMethod
  path?: string
  query?: Req | undefined
  body?: Req | null | undefined
  headers?: Headers | undefined

  maxRetries?: number
  stream?: boolean | undefined
  timeout?: number
  httpAgent?: any
  signal?: AbortSignal | undefined | null
  idempotencyKey?: string

  __binaryResponse?: boolean | undefined
  __streamClass?: any
}

type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

interface ChoiceDelta {
  content?: string | null
  function_call?: {
    arguments?: string
    name?: string
  }
  role?: 'system' | 'user' | 'assistant' | 'tool'
  tool_calls?: Array<{
    index: number
    id?: string
    function?: ToolCallFunction
    type?: 'function'
  }>
}
export interface IChatCompletionResponseStreamed {
  id: string
  choices: Array<
  {
    delta: ChoiceDelta
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call' | null
    index: number
    logprobs?: any | null
  }>

  created: number
  model: string
  object: 'chat.completion.chunk'
  system_fingerprint?: string
  x_groq?: {
    id?: string
    usage?: {
      completion_time?: number
      completion_tokens?: number
      prompt_time?: number
      prompt_tokens?: number
      queue_time?: number
      total_time?: number
      total_tokens?: number
    }
    error?: string
  }
}
export interface IChatCompletionResponse {
  choices: Array<{
    finish_reason: string
    index: number
    logprobs: any
    message: Message
  }>
  id?: string
  created?: number
  model?: string
  object?: string
  system_fingerprint?: string
  usage?: {
    completion_time?: number
    completion_tokens?: number
    prompt_time?: number
    prompt_tokens?: number
    queue_time?: number
    total_time?: number
    total_tokens?: number
  }
}

export interface ClientOptions {
  apiKey?: string | undefined
  organization?: string | null | undefined
  project?: string | null | undefined
  baseURL?: string | null | undefined
  timeout?: number
  httpAgent?: any
  fetch?: any | undefined
  maxRetries?: number
  defaultHeaders?: Record<string, string | null | undefined>
  defaultQuery?: Record<string, string | undefined>
  dangerouslyAllowBrowser?: boolean
}

export interface IGroqClient {
  _client: {
    baseURL: string
    maxRetries: number
    timeout: number
  }

}
export interface IChatCompletionCreateParamsStreaming extends IChatCompletionCreateParams {
  stream: true
}

export interface IChatCompletionCreateParamsNonStreaming extends IChatCompletionCreateParams {
  stream?: false
}
interface IChatCompletionCreateParams {
  messages: Message[]
  model: string
  frequency_penalty?: number
  logit_bias?: Record<string, number>
  logprobs?: boolean
  max_tokens?: number
  n?: number
  presence_penalty?: number
  response_format?: ResponseFormat
  seed?: number
  stop?: string | null | string[]
  stream?: boolean
  temperature?: number
  tool_choice?: ToolChoice
  tools?: Tool[]
  top_logprobs?: number
  top_p?: number
  user?: string
}

export interface Message {
  content: string
  role: string
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

export interface ToolCall {
  id?: string
  function?: ToolCallFunction
  type?: string
}

export interface ToolCallFunction {
  arguments?: string
  name?: string
}

export interface ResponseFormat {
  type?: string
}

export interface ToolChoice {
  string?: string
  toolChoice?: {
    function?: ToolChoiceFunction
    type?: string
  }
}
export interface ToolChoiceFunction {
  name?: string
}

export interface Tool {
  function?: ToolFunction
  type?: string
}

export interface ToolFunction {
  description?: string
  name?: string
  parameters?: Record<string, unknown>
}
