export const APIS: Record<
  string,
  { METHOD: string; ENDPOINT: string; OPERATION: string }
> = {
  UPSERT: {
    METHOD: "pinecone.index.upsert",
    ENDPOINT: "/vectors/upsert",
    OPERATION: "upsert",
  },
  QUERY: {
    METHOD: "pinecone.index.query",
    ENDPOINT: "/query",
    OPERATION: "query",
  },
  DELETE_ONE: {
    METHOD: "pinecone.index.deleteOne",
    ENDPOINT: "/vectors/delete",
    OPERATION: "deleteOne",
  },
  DELETE_MANY: {
    METHOD: "pinecone.index.deleteMany",
    ENDPOINT: "/vectors/delete",
    OPERATION: "deleteMany",
  },
  DELETE_ALL: {
    METHOD: "pinecone.index.deleteAll",
    ENDPOINT: "/vectors/delete",
    OPERATION: "deleteAll",
  },
};
