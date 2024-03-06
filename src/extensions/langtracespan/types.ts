import { DatabaseSpanAttributes, FrameworkSpanAttributes, LLMSpanAttributes } from "@langtrase/trace-attributes";

export type LangTraceSpanAttributes = LLMSpanAttributes |
  DatabaseSpanAttributes |
  FrameworkSpanAttributes;