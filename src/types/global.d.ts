import { LangtraceInitOptions } from '@langtrace-init/types'

export {}
// global.d.ts
declare global {
  // eslint-disable-next-line no-var
  var langtrace_initalized = false
  // eslint-disable-next-line no-var
  var langtrace_options: LangtraceInitOptions | undefined
}
