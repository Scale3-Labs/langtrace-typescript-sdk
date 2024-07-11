/* eslint-disable no-restricted-imports */
import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
import { version, name } from '../../../package.json'
import { APIS, Vendors } from '@langtrase/trace-attributes'
import { generateTextPatch } from './patch'
import { LangtraceInitOptions } from '@langtrace-init/types'
import * as ai from 'ai'

class VercelAIInstrumentation extends InstrumentationBase<any> {
  sdkOptions: LangtraceInitOptions
  patchedModule: typeof ai
  originalModule: typeof ai
  constructor () {
    super(name, version)
    this.sdkOptions = {}
    this.patchedModule = ai
    this.originalModule = ai
  }

  public manualPatch (_: any): void {
    // do nothing
  }

  public setSdkOptions (sdkOptions: LangtraceInitOptions): void {
    this.sdkOptions = sdkOptions
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'ai',
      ['>= 0.3.3'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Vercel AI SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion)
        return this.patchedModule
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Vercel AI SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(this.patchedModule)
          return this.patchedModule
        }
      }
    )
    return [module]
  }

  public _patch (moduleExports: any, moduleVersion?: string): any {
    if (moduleExports === undefined || Object.keys(moduleExports as Record<string, any>).length === 0) {
      diag.warn('Did you forget to add \\"import * as ai from \'ai\'\\" to Langtrace.init(instrumentations: { ai: ai })?')
      return
    }
    this.originalModule = Object.assign({}, moduleExports)
    const patchedModule = Object.assign({}, moduleExports)
    this.patchedModule = patchedModule
    this.patchedModule.generateText = generateTextPatch.call(this, moduleExports.generateText as (...args: any[]) => any, APIS.ai.GENERATE_TEXT.METHOD, this.tracer, version, name, moduleVersion)
    return this.patchedModule
  }

  public _unpatch (module: any): void {
    if (this.originalModule === undefined || Object.keys(this.originalModule as Record<string, any>).length === 0) {
      diag.warn('Did you forget to add \\"import * as ai from \'ai\'\\" to Langtrace.init(instrumentations: { ai: ai })?')
      return
    }
    this.patchedModule = Object.assign({}, this.originalModule)
  }
}
export const vercelAIInstrumentation = new VercelAIInstrumentation()

export const getVercelAISdk = (): typeof ai => {
  if (vercelAIInstrumentation.sdkOptions.disable_instrumentations?.only?.includes(Vendors.VERCEL) === true) {
    vercelAIInstrumentation._unpatch(vercelAIInstrumentation.patchedModule)
  } else {
    vercelAIInstrumentation._patch(ai)
  }
  return vercelAIInstrumentation.patchedModule
}
