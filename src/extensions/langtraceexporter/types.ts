export enum ExportResultCode {
  SUCCESS = 0,
  FAILED = 1
}

export interface ExportResult {
  code: ExportResultCode;
  error?: Error;
}