export const APIS: Record<string, { METHOD: string; OPERATION: string }> = {
  ADD: {
    METHOD: "chromadb.collection.add",
    OPERATION: "add",
  },
  QUERY: {
    METHOD: "chromadb.collection.query",
    OPERATION: "query",
  },
  DELETE: {
    METHOD: "chromadb.collection.delete",
    OPERATION: "delete",
  },
  PEEK: {
    METHOD: "chromadb.collection.peek",
    OPERATION: "peek",
  },
  UPDATE: {
    METHOD: "chromadb.collection.update",
    OPERATION: "update",
  },
  MODIFY: {
    METHOD: "chromadb.collection.modify",
    OPERATION: "modify",
  },
  COUNT: {
    METHOD: "chromadb.collection.count",
    OPERATION: "count",
  },
};
