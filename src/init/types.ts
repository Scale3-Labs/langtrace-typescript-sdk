export interface LangtraceInitOptions { api_key?: string, remote_url?: string, batch?: boolean, write_to_remote_url?: boolean, debug_log_to_console?: boolean }
export type LangTraceInit = (options?: LangtraceInitOptions) => void
