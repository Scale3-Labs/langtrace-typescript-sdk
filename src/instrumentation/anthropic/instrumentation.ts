import type Anthropic from '@anthropic-ai/sdk'
import { diag } from '@opentelemetry/api'
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition
} from '@opentelemetry/instrumentation'
import { messagesCreate } from '@langtrace-instrumentation/anthropic/patch'

class AnthropicInstrumentation extends InstrumentationBase<typeof Anthropic> {
  constructor () {
    super('@langtrase/node-sdk', '1.0.0')
  }

  init (): Array<InstrumentationNodeModuleDefinition<typeof Anthropic>> {
    const module = new InstrumentationNodeModuleDefinition<typeof Anthropic>(
      '@anthropic-ai/sdk',
      ['>=0.16.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Anthropic SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Anthropic SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  private _patch (anthropic: typeof Anthropic, version: string): void {
    this._wrap(
      anthropic.Messages.prototype,
      'create',
      (originalMethod: (...args: any[]) => any) =>
        messagesCreate(originalMethod, this.tracer, version)
    )
  }

  private _unpatch (anthropic: typeof Anthropic): void {
    this._unwrap(anthropic.Anthropic.Messages.prototype, 'create')
  }
}

export const anthropicInstrumentation = new AnthropicInstrumentation()
