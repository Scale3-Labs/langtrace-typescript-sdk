import { SpanExporter } from '@opentelemetry/sdk-trace-base'

export interface LangtraceInitOptions { api_key?: string, batch?: boolean, write_to_langtrace_cloud?: boolean, debug_log_to_console?: boolean, custom_remote_exporter?: SpanExporter }
export type LangTraceInit = (options?: LangtraceInitOptions) => void
