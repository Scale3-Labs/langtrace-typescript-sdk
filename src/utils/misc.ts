/* eslint-disable @typescript-eslint/no-dynamic-delete */
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

import axios from 'axios'
// eslint-disable-next-line no-restricted-imports
import { name, version } from '../../package.json'
import { ansiRegex } from 'ansi-colors'
import { Attributes, diag, DiagConsoleLogger, DiagLogLevel, Span, TimeInput } from '@opentelemetry/api'

/**
 *
 * @param obj record<string, any>
 * @param path dot separated string path
 * @returns value at the path in the object
 */
export function getValueFromPath (obj: Record<string, any>, path: string): any {
  if (path === undefined) {
    return undefined
  }
  return path.split('.').reduce((o, p) => (o !== undefined ? o[p] : undefined), obj)
}
/**
 *
 * @param obj record<string, any>
 * @param path dot separated string path
 * @param value value to set at the path in the object
 * @returns void
 */
export function setValueFromPath (obj: any, path: string, value: any): void {
  if (path === undefined) {
    return undefined
  }
  const keys = path.split('.')
  const lastKey = keys.pop()
  const deepObj = keys.reduce((o, p) => (o[p] = o[p] ?? {}), obj)
  if (lastKey !== undefined) {
    deepObj[lastKey] = value
  }
}

export async function getCurrentAndLatestVersion (): Promise<{ currentVersion: string, latestVersion: string } | undefined> {
  const res = await axios.get(`https://registry.npmjs.org/${name}/latest`)
  const latestVersion = res.data.version
  if (latestVersion !== undefined) {
    return { currentVersion: version, latestVersion }
  }
}

export const boxText = (text: string): string => {
  const lines = text.split('\n')
  const strippedLines = lines.map(line => line.replace(ansiRegex, ''))
  const longestLine = strippedLines.reduce((a, b) => (a.length > b.length ? a : b)).length

  const top = '┌' + '─'.repeat(longestLine + 2) + '┐'
  const bottom = '└' + '─'.repeat(longestLine + 2) + '┘'
  const middle = lines.map((line, index) => {
    const padding = longestLine - strippedLines[index].length
    return '│ ' + line + ' '.repeat(padding) + ' │'
  }).join('\n')

  return `\n${top}\n${middle}\n${bottom}\n`
}

/**
 * This function is used to convert an object to a string. It filters out functions and keys starting with '_' as they are considered private.
 * @param obj any
 * @returns string
 */
export function stringify (obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value !== 'function' && !key.startsWith('_')) {
      return value
    }
    return undefined
  }, 2)
}

/**
 *
 * @param stream input stream
 * @param generatorFuncResponse generator function response from the wrapped stream
 * @returns stream proxy
 */
export function createStreamProxy (stream: any, generatorFuncResponse: any): any {
  return new Proxy(stream, {
    get (target, prop, receiver) {
      if (prop === Symbol.asyncIterator) {
        return () => generatorFuncResponse
      }
      return Reflect.get(target, prop, receiver)
    }
  })
}

/**
 *
 * @param span span to add event to
 * @param name name of the event
 * @param attributesOrStartTime attributes or start time
 * @param startTime  start time
 * @returns span
 */
export function addSpanEvent (span: Span, name: string, attributesOrStartTime?: Attributes | TimeInput, startTime?: TimeInput): Span {
  if (process.env.TRACE_PROMPT_COMPLETION_DATA === 'true' && typeof attributesOrStartTime === 'object') {
    delete attributesOrStartTime['gen_ai.completion' as keyof typeof attributesOrStartTime]
    delete attributesOrStartTime['gen_ai.prompt' as keyof typeof attributesOrStartTime]
  }
  for (const attribute of global.langtrace_options?.disable_tracing_attributes ?? []) {
    if (typeof attributesOrStartTime === 'object') {
      delete attributesOrStartTime[attribute as keyof typeof attributesOrStartTime]
    }
  }
  if (typeof attributesOrStartTime === 'object' && Object.keys(attributesOrStartTime).length === 0) {
    return span
  }
  span.addEvent(name, attributesOrStartTime, startTime)
  return span
}

diag.setLogger(new DiagConsoleLogger(), { logLevel: DiagLogLevel.ALL, suppressOverrideMessage: true })
