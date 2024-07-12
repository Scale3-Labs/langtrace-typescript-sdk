import { Vendors } from '@langtrase/trace-attributes'
import { resolve } from 'path'
import { Resolver } from 'webpack'

export class ModuleAlias {
  supportedModuleAliases: string[]
  cwd: string
  constructor (cwd: string) {
    this.supportedModuleAliases = ['ai']
    this.cwd = cwd
  }

  apply (resolver: Resolver): void {
    resolver.getHook('before-resolve').tapAsync(this.constructor.name, (request, _context, callback) => {
      if (this.supportedModuleAliases.includes(request.request as string)) {
        const modulePath = request.path
        if (typeof modulePath === 'string' && modulePath?.includes('node_modules/@langtrase/typescript-sdk')) {
          // Use the original module if imported from the SDK. Cwd comes from the project using the SDK
          if (request.request === Vendors.VERCEL) {
            request.request = resolve(this.cwd, `node_modules/${Vendors.VERCEL}`)
          }
        } else {
          // Use the alias module for all other imports of the module
          if (request.request === Vendors.VERCEL) {
            request.request = resolve(this.cwd, `node_modules/@langtrase/typescript-sdk/dist/module-wrappers/${Vendors.VERCEL}.js`)
          }
        }
      }
      callback()
    })
  }
}
