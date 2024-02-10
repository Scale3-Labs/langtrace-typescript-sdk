import { TiktokenEncoding } from "tiktoken";

// TODO: Add more models
export const TIKTOKEN_MODEL_MAPPING: Record<string, TiktokenEncoding> = {
  "gpt-4": "cl100k_base",
};
