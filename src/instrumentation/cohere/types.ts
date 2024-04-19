import { ApiMeta } from 'cohere-ai/api'

// Functions
export type ChatFn = (request: IChatRequest, requestOptions?: IRequestOptions) => Promise<INonStreamedChatResponse>
export type ChatStreamFn = (request: IChatRequest, requestOptions?: IRequestOptions) => Promise<any>
export type EmbedFn = (request: IEmbedRequest, requestOptions?: IRequestOptions) => Promise<IEmbedResponse>
export type RerankFn = (request: IRerankRequest, requestOptions?: IRequestOptions) => Promise<IRerankResponse>

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

type EmbeddingType = 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary'
type EmbedInputType = 'search_document' | 'search_query' | 'classification' | 'clustering'
type EmbedRequestTruncate = 'NONE' | 'START' | 'END'
export interface IEmbedRequest {
  texts: string[]
  model?: string
  inputType?: EmbedInputType
  embeddingTypes?: EmbeddingType[]
  truncate?: EmbedRequestTruncate
}
export interface IEmbedResponse {
  id: string
  embeddings: number[][] | EmbedByTypeResponseEmbeddings
  texts: string[]
  meta?: ApiMeta
  responseType: 'embeddings_floats' | 'embeddings_by_type'
}
interface EmbedByTypeResponseEmbeddings {
  float?: number[][]
  int8?: number[][]
  uint8?: number[][]
  binary?: number[][]
  ubinary?: number[][]
}

interface RerankDocument {
  text: string
}

export interface IRerankRequest {
  model?: string
  query: string
  documents: RerankDocument[] | string[]
  topN?: number
  rankFields?: string[]
  returnDocuments?: boolean
  maxChunksPerDoc?: number
}

interface RerankResponseResultsItem {
  document?: RerankDocument[]
  index: number
  relevanceScore: number
}

export interface IRerankResponse {
  id?: string
  results: RerankResponseResultsItem[]
  meta: ApiMeta
}
