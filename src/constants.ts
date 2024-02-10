import { TiktokenEncoding } from "tiktoken";

// TODO: Add more models
// https://github.com/dqbd/tiktoken/blob/74c147e19584a3a1acea0c8e0da4d39415cd33e0/wasm/src/lib.rs#L328
export const TIKTOKEN_MODEL_MAPPING: Record<string, TiktokenEncoding> = {
  "gpt-4": "cl100k_base",
};
