export class ModuleAlias {
  constructor (options) {
    this.alias = options.alias
    this.originalPath = options.originalPath
    this.aliasPath = options.aliasPath
  }

  apply (resolver) {
    resolver.getHook('before-resolve').tapAsync('ConditionalAliasPlugin', (request, resolveContext, callback) => {
      if (request.request === this.alias) {
        const modulePath = request.path

        if (modulePath && modulePath.includes('node_modules/@langtrase/typescript-sdk')) {
          // Use the original module if imported from specific path
          request.request = this.originalPath
        } else {
          // Use the alias module for all other imports
          request.request = this.aliasPath
        }
      }
      callback()
    })
  }
}
