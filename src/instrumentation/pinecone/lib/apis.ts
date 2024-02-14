export const APIS = {
  UPSERT: {
    METHOD: "pinecone.index.upsert",
    ENDPOINT: "/vectors/upsert",
  },
  QUERY: {
    METHOD: "pinecone.index.query",
    ENDPOINT: "/query",
  },
  DELETE_ONE: {
    METHOD: "pinecone.index.deleteOne",
    ENDPOINT: "/vectors/delete",
  },
  DELETE_MANY: {
    METHOD: "pinecone.index.deleteMany",
    ENDPOINT: "/vectors/delete",
  },
  DELETE_ALL: {
    METHOD: "pinecone.index.deleteAll",
    ENDPOINT: "/vectors/delete",
  },
};
