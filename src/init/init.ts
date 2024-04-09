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
import { anthropicInstrumentation } from '@langtrace-instrumentation/anthropic/instrumentation'
import { chromaInstrumentation } from '@langtrace-instrumentation/chroma/instrumentation'
import { llamaIndexInstrumentation } from '@langtrace-instrumentation/llamaindex/instrumentation'
import { openAIInstrumentation } from '@langtrace-instrumentation/openai/instrumentation'
import { pineconeInstrumentation } from '@langtrace-instrumentation/pinecone/instrumentation'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types'

export const init: LangTraceInit = ({
  api_key = undefined,
  batch = true,
  write_to_langtrace_cloud = true,
  debug_log_to_console = false,
  custom_remote_exporter = undefined,
  instrumentations = {}
}: LangtraceInitOptions = {}) => {
  // Set up OpenTelemetry tracing
  const provider = new NodeTracerProvider({})

  const remoteWriteExporter = new LangTraceExporter(api_key, write_to_langtrace_cloud)
  const consoleExporter = new ConsoleSpanExporter()
  const batchProcessorRemote = new BatchSpanProcessor(remoteWriteExporter)
  const simpleProcessorRemote = new SimpleSpanProcessor(remoteWriteExporter)
  const batchProcessorConsole = new BatchSpanProcessor(consoleExporter)
  const simpleProcessorConsole = new SimpleSpanProcessor(consoleExporter)

  if (debug_log_to_console) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL)
  }

  if (write_to_langtrace_cloud && !batch && custom_remote_exporter === undefined) {
    throw new Error('Batching is required when writing to the LangTrace cloud')
  }
  if (custom_remote_exporter !== undefined) {
    if (batch) {
      provider.addSpanProcessor(new BatchSpanProcessor(custom_remote_exporter))
    } else {
      provider.addSpanProcessor(new SimpleSpanProcessor(custom_remote_exporter))
    }
  } else if (!write_to_langtrace_cloud) {
    if (batch) {
      provider.addSpanProcessor(batchProcessorConsole)
    } else {
      provider.addSpanProcessor(simpleProcessorConsole)
    }
  } else {
    if (batch) {
      provider.addSpanProcessor(batchProcessorRemote)
    } else {
      provider.addSpanProcessor(simpleProcessorRemote)
    }
  }

  provider.register()
  if (instrumentations === undefined) {
    registerInstrumentations({
      instrumentations: [
        pineconeInstrumentation,
        chromaInstrumentation,
        llamaIndexInstrumentation,
        openAIInstrumentation,
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
  registerInstrumentations({ tracerProvider: provider })
}
