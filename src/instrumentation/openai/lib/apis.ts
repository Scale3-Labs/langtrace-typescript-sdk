import { OpenAIMethods } from "@langtrase/trace-attributes";

export const APIS = {
  CHAT_COMPLETION: {
    METHOD: OpenAIMethods.CHAT_COMPLETION,
    ENDPOINT: "/chat/completions",
  },
  IMAGES_GENERATION: {
    METHOD: OpenAIMethods.IMAGES_GENERATION,
    ENDPOINT: "/images/generations",
  },
  EMBEDDINGS_CREATE: {
    METHOD: OpenAIMethods.EMBEDDINGS_CREATE,
    ENDPOINT: "/embeddings",
  },
};
