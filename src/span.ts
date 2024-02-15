import {
  Event,
  LangTraceSpanAttributes,
  OpenAISpanAttributes,
  PineconeSpanAttributes,
} from "@langtrase/trace-attributes";
import { Span, Tracer } from "@opentelemetry/api";

export type LangTraceAttributes = OpenAISpanAttributes &
  PineconeSpanAttributes &
  LangTraceSpanAttributes;
export class LangTraceSpan {
  private span: Span;
  private tracer: Tracer;

  constructor(
    tracer: Tracer,
    name: string,
    options?: Omit<LangTraceAttributes, "[k: string]: unknown">
  ) {
    this.tracer = tracer;
    this.span = this.tracer.startSpan(name, options);
  }

  addAttribute(attributes: Partial<LangTraceAttributes>): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        this.span.setAttribute(key, value as string);
      }
    });
  }

  setStatus(status: { code: number; message?: string }): void {
    this.span.setStatus(status);
  }

  recordException(error: Error): void {
    this.span.recordException(error);
  }
  addEvent(name: Event, attributes?: any): void {
    this.span.addEvent(name, attributes);
  }

  end(): void {
    this.span.end();
  }
}
