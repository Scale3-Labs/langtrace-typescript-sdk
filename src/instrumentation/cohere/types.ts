import { Cohere } from 'cohere-ai'

// Functions
export type ChatFn = (request: IChatRequest, requestOptions?: IRequestOptions) => Promise<INonStreamedChatResponse>
export type ChatStreamFn = (request: IChatRequest, requestOptions?: IRequestOptions) => Promise<Cohere.StreamedChatResponse>

// Interfaces
export interface IOptions {
  token?: string | undefined
  clientName?: string | undefined
}
export interface IRequestOptions {
  timeoutInSeconds?: number
  maxRetries?: number
}

export interface ICohereClient {
  chat: ChatFn
  _options: IOptions
}
interface IChatMessage {
  role: 'CHATBOT' | 'SYSTEM' | 'USER'
  message: string
}
interface IChatConnector {

  id: string
  userAccessToken?: string
  continueOnFailure?: boolean
  options?: Record<string, unknown>
}

export interface ITool {
  name: string
  description: string
  parameterDefinitions?: Record<string, {
    description?: string
    type: string
    required?: boolean
  }>
}

interface IToolResultsItem {
  call: IToolCall
  outputs: Array<Record<string, unknown>>
}
export interface IChatRequest {
  message: string
  model?: string
  preamble?: string
  p?: number
  k?: number
  seed?: number
  documents?: Record<string, string>
  chatHistory?: IChatMessage[]
  connectors?: IChatConnector[]
  tools?: ITool[]
  toolResults?: IToolResultsItem[]
  presencePenalty?: number
  conversationId?: string
  temperature?: number
  frequencyPenalty?: number
  maxTokens?: number
  maxInputTokens?: number
}
interface IApiMeta {
  billedUnits?: {
    inputTokens?: number
    outputTokens?: number
    searchUnits?: number
    classifications?: number
  }
  tokens?: {
    inputTokens?: number
    outputTokens?: number
  }
  warnings?: string[]
}
interface IToolCall {
  name: string
  parameters: Record<string, unknown>

}

export interface INonStreamedChatResponse {
  response_id: string
  isSearchRequired: boolean
  text: string
  generationId?: string
  meta?: IApiMeta
  toolCalls?: IToolCall[]
  chatHistory?: IChatMessage[]
}
