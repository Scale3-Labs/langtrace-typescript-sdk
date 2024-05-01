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
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { chromaInstrumentation } from '@langtrace-instrumentation/chroma/instrumentation'
import { llamaIndexInstrumentation } from '@langtrace-instrumentation/llamaindex/instrumentation'
import { pineconeInstrumentation } from '@langtrace-instrumentation/pinecone/instrumentation'
import { LangtraceSampler } from '@langtrace-extensions/langtracesampler/langtrace_sampler'
import { LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types'
import { LANGTRACE_REMOTE_URL } from '@langtrace-constants/exporter/langtrace_exporter'
import { anthropicInstrumentation } from '@langtrace-instrumentation/anthropic/instrumentation'
import { openAIInstrumentation } from '@langtrace-instrumentation/openai/instrumentation'
import { cohereInstrumentation } from '@langtrace-instrumentation/cohere/instrumentation'
import { qdrantInstrumentation } from '@langtrace-instrumentation/qdrant/instrumentation'
import { groqInstrumentation } from '@langtrace-instrumentation/groq/instrumentation'

export const init: LangTraceInit = ({
  api_key = undefined,
  batch = false,
  write_to_langtrace_cloud = true,
  custom_remote_exporter = undefined,
  instrumentations = undefined,
  api_host = LANGTRACE_REMOTE_URL
}: LangtraceInitOptions = {}) => {
  // Set up OpenTelemetry tracing
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

  if (instrumentations === undefined) {
    registerInstrumentations({
      instrumentations: [
        pineconeInstrumentation,
        cohereInstrumentation,
        chromaInstrumentation,
        llamaIndexInstrumentation,
        openAIInstrumentation,
        anthropicInstrumentation,
        qdrantInstrumentation,
        groqInstrumentation,
        anthropicInstrumentation
      ],
      tracerProvider: provider
    })
    return
  }
  if (instrumentations?.openai !== undefined) {
    openAIInstrumentation.manualPatch(instrumentations.openai)
  }

  if (instrumentations?.anthropic !== undefined) {
    anthropicInstrumentation.manualPatch(instrumentations.anthropic)
  }

  if (instrumentations?.chromadb !== undefined) {
    chromaInstrumentation.manualPatch(instrumentations.chromadb)
  }

  if (instrumentations?.llamaindex !== undefined) {
    llamaIndexInstrumentation.manualPatch(instrumentations.llamaindex)
  }

  if (instrumentations?.pinecone !== undefined) {
    pineconeInstrumentation.manualPatch(instrumentations.pinecone)
  }
  if (instrumentations?.cohere !== undefined) {
    cohereInstrumentation.manualPatch(instrumentations.cohere)
  }
  if (instrumentations?.groq !== undefined) {
    groqInstrumentation.manualPatch(instrumentations.groq)
  }
  registerInstrumentations({ tracerProvider: provider })
}
