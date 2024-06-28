// Functions
export type ChatFn = (request: IChatRequest) => Promise<IChatResponse>
export type ChatStreamFn = (request: IChatRequest & { stream: true }) => Promise<AsyncIterable<IChatResponse>>
export type GenerateFn = (request: IGenerateRequest) => Promise<IGenerateResponse>
export type GenerateStreamFn = (request: IGenerateRequest) => Promise<AsyncIterable<IGenerateResponse>>
export type EmbeddingsFn = (request: IEmbeddingsRequest) => Promise<IEmbeddingsResponse>

export interface IChatRequest {
  model: string
  messages?: Message[]
  stream?: boolean
  format?: string
  keep_alive?: string | number
  options?: Partial<Options>
}

interface Message {
  role: string
  content: string
  images?: Uint8Array[] | string[]
}

interface Options {
  numa: boolean
  num_ctx: number
  num_batch: number
  num_gpu: number
  main_gpu: number
  low_vram: boolean
  f16_kv: boolean
  logits_all: boolean
  vocab_only: boolean
  use_mmap: boolean
  use_mlock: boolean
  embedding_only: boolean
  num_thread: number
  num_keep: number
  seed: number
  num_predict: number
  top_k: number
  top_p: number
  tfs_z: number
  typical_p: number
  repeat_last_n: number
  temperature: number
  repeat_penalty: number
  presence_penalty: number
  frequency_penalty: number
  mirostat: number
  mirostat_tau: number
  mirostat_eta: number
  penalize_newline: boolean
  stop: string[]
}

export interface IChatResponse {
  model: string
  created_at: Date
  message: Message
  done: boolean
  done_reason: string
  total_duration: number
  load_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  eval_count: number
  eval_duration: number
}

export interface IOllamaClient {
  config: {
    host: string
    proxy?: boolean
  }
}

export interface IGenerateRequest {
  model: string
  prompt: string
  system?: string
  template?: string
  context?: number[]
  stream?: boolean
  raw?: boolean
  format?: string
  images?: Uint8Array[] | string[]
  keep_alive?: string | number
  options?: Partial<Options>
}

export interface IGenerateResponse {
  model: string
  created_at: Date
  response: string
  done: boolean
  done_reason: string
  context: number[]
  total_duration: number
  load_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  eval_count: number
  eval_duration: number
}

export interface IEmbeddingsRequest {
  model: string
  prompt: string
  keep_alive?: string | number
  options?: Partial<Options>
}

export interface IEmbeddingsResponse {
  embedding: number[]
}
