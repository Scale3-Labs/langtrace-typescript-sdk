import { Vendors } from '@langtrase/trace-attributes'
import { resolve } from 'path'
export class ModuleAlias {
  supportedModuleAliases: string[]
  cwd: string
  constructor (cwd: string) {
    this.supportedModuleAliases = ['ai']
    this.cwd = cwd
  }

  apply (resolver: any): any {
    resolver.getHook('before-resolve').tapAsync(this.constructor.name, (request: any, _: any, callback: any) => {
      if (this.supportedModuleAliases.includes(request.request as string)) {
        const modulePath = request.path

        if (modulePath?.includes('node_modules/@langtrase/typescript-sdk') === true) {
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
