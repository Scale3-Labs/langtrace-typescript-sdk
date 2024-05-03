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

import { LangTraceExporter } from '@langtrace-extensions/langtraceexporter/langtrace_exporter'
import { InstrumentationBase, registerInstrumentations } from '@opentelemetry/instrumentation'
import { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { LangtraceSampler } from '@langtrace-extensions/langtracesampler/langtrace_sampler'
import { InstrumentationType, LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types'
import { LANGTRACE_REMOTE_URL } from '@langtrace-constants/exporter/langtrace_exporter'
import { anthropicInstrumentation } from '@langtrace-instrumentation/anthropic/instrumentation'
import { chromaInstrumentation } from '@langtrace-instrumentation/chroma/instrumentation'
import { cohereInstrumentation } from '@langtrace-instrumentation/cohere/instrumentation'
import { groqInstrumentation } from '@langtrace-instrumentation/groq/instrumentation'
import { llamaIndexInstrumentation } from '@langtrace-instrumentation/llamaindex/instrumentation'
import { openAIInstrumentation } from '@langtrace-instrumentation/openai/instrumentation'
import { pineconeInstrumentation } from '@langtrace-instrumentation/pinecone/instrumentation'
import { qdrantInstrumentation } from '@langtrace-instrumentation/qdrant/instrumentation'

export const init: LangTraceInit = ({
  api_key = undefined,
  batch = false,
  write_to_langtrace_cloud = true,
  custom_remote_exporter = undefined,
  instrumentations = undefined,
  api_host = LANGTRACE_REMOTE_URL,
  disable_instrumentations = {}
}: LangtraceInitOptions = {}) => {
  const provider = new NodeTracerProvider({ sampler: new LangtraceSampler() })
  const remoteWriteExporter = new LangTraceExporter(api_key, write_to_langtrace_cloud, api_host)
  const consoleExporter = new ConsoleSpanExporter()
  const batchProcessorRemote = new BatchSpanProcessor(remoteWriteExporter)

  const batchProcessorConsole = new BatchSpanProcessor(consoleExporter)
  const simpleProcessorConsole = new SimpleSpanProcessor(consoleExporter)

  if (write_to_langtrace_cloud) {
    provider.addSpanProcessor(batchProcessorRemote)
  } else if (custom_remote_exporter !== undefined) {
    if (batch) {
      provider.addSpanProcessor(new BatchSpanProcessor(custom_remote_exporter))
    } else {
      provider.addSpanProcessor(new SimpleSpanProcessor(custom_remote_exporter))
    }
  } else {
    if (batch) {
      provider.addSpanProcessor(batchProcessorConsole)
    } else {
      provider.addSpanProcessor(simpleProcessorConsole)
    }
  }

  provider.register()

  const allInstrumentations: Record<InstrumentationType, any> = {
    openai: openAIInstrumentation,
    cohere: cohereInstrumentation,
    anthropic: anthropicInstrumentation,
    groq: groqInstrumentation,
    pinecone: pineconeInstrumentation,
    llamaindex: llamaIndexInstrumentation,
    chromadb: chromaInstrumentation,
    qdrant: qdrantInstrumentation
  }
  if (instrumentations === undefined) {
    registerInstrumentations({
      instrumentations: getInstrumentations(disable_instrumentations, allInstrumentations),
      tracerProvider: provider
    })
  } else {
    Object.entries(instrumentations).forEach(([key, value]) => {
      if (value !== undefined) {
        allInstrumentations[key as InstrumentationType].manualPatch(value)
      }
    })
    registerInstrumentations({ tracerProvider: provider })
  }
}

const getInstrumentations = (disable_instrumentations: { all_except?: string[], only?: string[] }, allInstrumentations: Record<InstrumentationType, InstrumentationBase>): InstrumentationBase[] => {
  if (disable_instrumentations.only !== undefined && disable_instrumentations.all_except !== undefined) {
    throw new Error('Cannot specify both only and all_except in disable_instrumentations')
  }
  const instrumentations = Object.fromEntries(Object.entries(allInstrumentations)
    .filter(([key, instrumentation]) => {
      if (disable_instrumentations.only !== undefined) {
        if (disable_instrumentations.only.includes(key as InstrumentationType)) {
          instrumentation.disable()
          return false
        }
      }
      if (disable_instrumentations.all_except !== undefined) {
        if (!disable_instrumentations.all_except.includes(key as InstrumentationType)) {
          instrumentation.disable()
          return false
        }
      }
      return true
    }))
  return Object.values(instrumentations)
}
