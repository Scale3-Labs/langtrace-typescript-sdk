declare module '*/package.json' {
  export const name: string
  export const version: string
  export const dependencies: Record<string, string>
  // Define other properties from package.json you need
}
