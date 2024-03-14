import { ChromaDBMethods } from '@langtrase/trace-attributes'

export const APIS: Record<string, { METHOD: string, OPERATION: string }> = {
  ADD: {
    METHOD: ChromaDBMethods.ADD,
    OPERATION: 'add'
  },
  QUERY: {
    METHOD: ChromaDBMethods.QUERY,
    OPERATION: 'query'
  },
  DELETE: {
    METHOD: ChromaDBMethods.DELETE,
    OPERATION: 'delete'
  },
  PEEK: {
    METHOD: ChromaDBMethods.PEEK,
    OPERATION: 'peek'
  },
  UPDATE: {
    METHOD: ChromaDBMethods.UPDATE,
    OPERATION: 'update'
  },
  MODIFY: {
    METHOD: ChromaDBMethods.MODIFY,
    OPERATION: 'modify'
  },
  COUNT: {
    METHOD: ChromaDBMethods.COUNT,
    OPERATION: 'count'
  }
}
