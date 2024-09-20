export class LangtraceSdkError extends Error {
  message: string
  name: string
  stack?: string | undefined
  constructor (message: string, stack?: string) {
    super(message)
    this.message = message
    this.stack = stack
    this.name = 'LangTraceSdkError'
  }
}
