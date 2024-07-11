/* eslint-disable max-len */
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
import { getVercelAISdk } from '@langtrace-instrumentation/vercel/instrumentation'
import { EvaluationAPIData, LangTraceEvaluation, LangtracePrompt } from '@langtrace-utils/types'
import { Vendor } from '@langtrase/trace-attributes'
import axios from 'axios'

/**
 * Fetches a prompt from the registry.
 *
 * @param promptRegistryId - The ID of the prompt registry.
 * @param options - Configuration options for fetching the prompt:
 *    - `prompt_version` - Fetches the prompt with the specified version. If not provided, the live prompt will be fetched. If there is no live prompt, an error will be thrown.
 *    - `variables`: - Replaces the variables in the prompt with the provided values. Each key of the object should be the variable name, and the corresponding value should be the value to replace.
 * @returns LangtracePrompt - The fetched prompt with variables replaced as specified.
 */
export const getPromptFromRegistry = async (promptRegistryId: string, options?: { prompt_version?: number, variables?: Record<string, string> }): Promise<LangtracePrompt> => {
  const queryParams = new URLSearchParams({ promptset_id: promptRegistryId })
  try {
    if (options?.prompt_version !== undefined) {
      queryParams.append('version', options.prompt_version.toString())
    }
    if (options?.variables !== undefined) {
      Object.entries(options.variables).forEach(([key, value]) => {
        queryParams.append(`variables.${key}`, value)
      })
    }
    const response = await axios.get(`${process.env.LANGTRACE_API_HOST}/api/promptset?${queryParams.toString()}`, { headers: { 'x-api-key': process.env.LANGTRACE_API_KEY } })
    return response.data.prompts[0] as LangtracePrompt
  } catch (err: any) {
    throw Error(`An error occured when trying to get the prompt from registry ${process.env.LANGTRACE_API_HOST}/api/promptset?${queryParams.toString()} ${JSON.stringify(err.stack)}`)
  }
}

/**
 *
 * @param userId id of the user giving feedback
 * @param score score of the feedback
 * @param traceId traceId of the llm interaction. This is available when the inteaction is wrapped in withLangtraceRootSpan
 * @param spanId spanId of the llm interaction. This is available when the inteaction is wrapped in withLangtraceRootSpan
 *
 */
export const sendUserFeedback = async ({ userId, userScore, traceId, spanId }: EvaluationAPIData): Promise<void> => {
  const evaluation = await getEvaluation(spanId).catch((err) => {
    throw err
  })
  try {
    if (evaluation !== undefined) {
      // make a put request to update the evaluation
      await axios.put(`${process.env.LANGTRACE_API_HOST}/api/evaluation`, { userId, userScore, spanId, traceId }, { headers: { 'x-api-key': process.env.LANGTRACE_API_KEY } })
    } else {
    // make a post request to create a new evaluation
      await axios.post(`${process.env.LANGTRACE_API_HOST}/api/evaluation`, { userId, userScore, spanId, traceId }, { headers: { 'x-api-key': process.env.LANGTRACE_API_KEY } })
    }
  } catch (err: any) {
    throw Error(`An error occured while sending user feedback to langtrace ${process.env.LANGTRACE_API_HOST}/api/evaluation ${JSON.stringify(err.stack)}`)
  }
}

/**
 *
 * @param spanId spanId of the evaluation to be fetched
 * @returns LangTraceEvaluation | undefined
 */
const getEvaluation = async (spanId: string): Promise<LangTraceEvaluation | undefined> => {
  try {
    const response = await axios.get(`${process.env.LANGTRACE_API_HOST}/api/evaluation?spanId=${spanId}`, { headers: { 'x-api-key': process.env.LANGTRACE_API_KEY } })
    return response.data.evaluations[0] as LangTraceEvaluation
  } catch (err: any) {
    throw Error(`An error occured when trying to get the evaluation from langtrace ${process.env.LANGTRACE_API_HOST}/api/evaluation?spanId=${spanId} ${JSON.stringify(err.stack)}`)
  }
}

/**
 *
 * @param vendor vendor of the sdk to be traced
 * @returns returns the traced sdk
 */
export const getTracedSdk = (vendor: Extract<Vendor, 'ai'>): ReturnType<typeof getVercelAISdk> => {
  switch (vendor) {
    case 'ai':
      return getVercelAISdk()
    default:
      throw new Error('Unsupported vendor')
  }
}
