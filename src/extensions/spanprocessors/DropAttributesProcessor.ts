import { Span, SpanProcessor } from '@opentelemetry/sdk-trace-base'

export class DropAttributesProcessor implements SpanProcessor {
  // List of attributes to drop
  private readonly attributesToDrop: string[]
  constructor (attributesToDrop: string[]) {
    this.attributesToDrop = attributesToDrop
  }

  onStart (span: Span): void {
    // Drop specified attributes
    if (this.attributesToDrop === undefined) return
    for (const attribute of this.attributesToDrop) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete span.attributes[attribute]
    }
  }

  onEnd (span: Span): void {
    // Optional: Do something when the span ends, if needed
  }

  async shutdown (): Promise<void> {
    return await Promise.resolve()
  }

  async forceFlush (): Promise<void> {
    return await Promise.resolve()
  }
}
