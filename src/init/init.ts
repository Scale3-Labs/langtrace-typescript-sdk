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
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { ChromaClient } from 'chromadb'
import * as llamaindex from 'llamaindex'
import { Pinecone } from '@pinecone-database/pinecone'

export const init: LangTraceInit = ({
  api_key = undefined,
  batch = true,
  write_to_langtrace_cloud = true,
  debug_log_to_console = false,
  custom_remote_exporter = undefined,
  instrumentModules = {}
}: LangtraceInitOptions = {}) => {
  // Set up OpenTelemetry tracing
  const provider = new NodeTracerProvider()

  const remoteWriteExporter = new LangTraceExporter(api_key, write_to_langtrace_cloud)
  const consoleExporter = new ConsoleSpanExporter()
  const batchProcessorRemote = new BatchSpanProcessor(remoteWriteExporter)
  const simpleProcessorRemote = new SimpleSpanProcessor(remoteWriteExporter)
  const batchProcessorConsole = new BatchSpanProcessor(consoleExporter)
  const simpleProcessorConsole = new SimpleSpanProcessor(consoleExporter)

  if (debug_log_to_console) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
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

  if (instrumentModules?.openAI !== undefined) {
    diag.info('Initializing OpenAI instrumentation')

    openAIInstrumentation.manuallyInstrument(instrumentModules.openAI as typeof OpenAI, '1.0.0')
  }

  if (instrumentModules?.anthropic !== undefined) {
    diag.info('Initializing Anthropic instrumentation')
    anthropicInstrumentation.manuallyInstrument(instrumentModules.anthropic as typeof Anthropic, '1.0.0')
  }

  if (instrumentModules?.chroma !== undefined) {
    diag.info('Initializing Chroma instrumentation')
    chromaInstrumentation.manuallyInstrument(instrumentModules.chroma as typeof ChromaClient, '1.8.1')
  }

  if (instrumentModules?.llamaIndex !== undefined) {
    diag.info('Initializing LlamaIndex instrumentation')
    llamaIndexInstrumentation.manuallyInstrument(instrumentModules.llamaIndex as typeof llamaindex, '1.0.0')
  }

  if (instrumentModules?.pinecone !== undefined) {
    diag.info('Initializing Pinecone instrumentation')
    pineconeInstrumentation.manuallyInstrument(instrumentModules.pinecone as typeof Pinecone, '2.0.0')
  }

  if (instrumentModules !== undefined) {
    diag.info('Manuall Instrumentation complete')
    return
  }
  // Register any automatic instrumentation and your custom OpenAI instrumentation
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
}
