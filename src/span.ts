import {
  LangTraceSpanAttributes,
  OpenAISpanAttributes,
  OpenAISpanEvents,
} from "@langtrase/trace-attributes";
import { Span, Tracer } from "@opentelemetry/api";

export class LangTraceSpan {
  private span: Span;
  private tracer: Tracer;

  constructor(
    tracer: Tracer,
    name: string,
    options?: Omit<
      OpenAISpanAttributes & LangTraceSpanAttributes,
      "[k: string]: unknown"
    >
  ) {
    this.tracer = tracer;
    this.span = this.tracer.startSpan(name, options);
  }

  addAttribute(
    attributes: Partial<OpenAISpanAttributes & LangTraceSpanAttributes>
  ): void {
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

  addEvent(name: OpenAISpanEvents, attributes?: any): void {
    this.span.addEvent(name, attributes);
  }

  end(): void {
    this.span.end();
  }
}
