export interface LangtraceInitOptions { api_key?: string, batch?: boolean, write_to_remote_url?: boolean, debug_log_to_console?: boolean }
export type LangTraceInit = (options?: LangtraceInitOptions) => void
