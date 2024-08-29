export interface CandidateContentPart {
  text: string
  functionCall: any
}

export interface CandidateContent {
  role: string
  parts: CandidateContentPart[]
}

export interface Candidate {
  content: CandidateContent
  finishReason: string
  safetyRatings: any[]
  avgLogprobs: number
  index: number
}

export interface UsageMetadata {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
}

export interface Response {
  text?: any
  candidates: Candidate[]
  usageMetadata: UsageMetadata
}

export interface Resp {
  stream?: any
  response: Response
}
