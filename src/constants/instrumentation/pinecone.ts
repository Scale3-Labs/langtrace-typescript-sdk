import { PineconeMethods } from '@langtrase/trace-attributes'

export const APIS: Record<
string,
{ METHOD: string, ENDPOINT: string, OPERATION: string }
> = {
  UPSERT: {
    METHOD: PineconeMethods.UPSERT,
    ENDPOINT: '/vectors/upsert',
    OPERATION: 'upsert'
  },
  QUERY: {
    METHOD: PineconeMethods.QUERY,
    ENDPOINT: '/query',
    OPERATION: 'query'
  },
  DELETE_ONE: {
    METHOD: PineconeMethods.DELETE_ONE,
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteOne'
  },
  DELETE_MANY: {
    METHOD: PineconeMethods.DELETE_MANY,
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteMany'
  },
  DELETE_ALL: {
    METHOD: PineconeMethods.DELETE_ALL,
    ENDPOINT: '/vectors/delete',
    OPERATION: 'deleteAll'
  }
}
