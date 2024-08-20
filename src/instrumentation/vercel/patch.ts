/* eslint-disable @typescript-eslint/no-this-alias */
import { embedPatchOpenAI, generateTextPatchOpenAI, streamTextPatchOpenAI } from '@langtrace-instrumentation/vercel/openai'
import { generateTextPatchAnthropic, streamTextPatchAnthropic, generateObjectPatchAnthropic, streamObjectPatchAnthropic } from '@langtrace-instrumentation/vercel/anthropic'
import { Vendors } from '@langtrase/trace-attributes'
import { Tracer } from '@opentelemetry/api'

export function generateTextPatch (
  this: any,
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  const patchThis = this
  return async function (this: any, ...args: any[]): Promise<any> {
    if (args[0]?.model?.config?.provider?.includes(Vendors.OPENAI) === true) {
      return await generateTextPatchOpenAI.call(this, patchThis, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    if (args[0]?.model?.config?.provider?.includes(Vendors.ANTHROPIC) === true) {
      return await generateTextPatchAnthropic.call(this, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    const result = originalMethod.apply(this, args)
    if (result instanceof Promise) {
      return await result
    }
    return result
  }
}

export function embedPatch (
  this: any,
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  const patchThis = this
  return async function (this: any, ...args: any[]): Promise<any> {
    if (args[0]?.model?.config?.provider?.includes(Vendors.OPENAI) === true) {
      return await embedPatchOpenAI.call(this, patchThis, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    const result = originalMethod.apply(this, args)
    if (result instanceof Promise) {
      return await result
    }
    return result
  }
}

export function streamTextPatch (
  this: any,
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  const patchThis = this
  return async function (this: any, ...args: any[]): Promise<any> {
    if (args[0]?.model?.config?.provider?.includes(Vendors.OPENAI) === true) {
      return await streamTextPatchOpenAI.call(this, patchThis, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    if (args[0]?.model?.config?.provider?.includes(Vendors.ANTHROPIC) === true) {
      return await streamTextPatchAnthropic.call(this, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    const result = originalMethod.apply(this, args)
    if (result instanceof Promise) {
      return await result
    }
    return result
  }
}

export function generateObjectPatch (
  this: any,
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]): Promise<any> {
    if (args[0]?.model?.config?.provider?.includes(Vendors.ANTHROPIC) === true) {
      return await generateObjectPatchAnthropic.call(this, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    const result = originalMethod.apply(this, args)
    if (result instanceof Promise) {
      return await result
    }
    return result
  }
}

export function streamObjectPatch (
  this: any,
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]): Promise<any> {
    if (args[0]?.model?.config?.provider?.includes(Vendors.ANTHROPIC) === true) {
      return await streamObjectPatchAnthropic.call(this, args, originalMethod, method, tracer, langtraceVersion, sdkName, version)
    }
    const result = originalMethod.apply(this, args)
    if (result instanceof Promise) {
      return await result
    }
    return result
  }
}
