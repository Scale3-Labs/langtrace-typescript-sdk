/**
 * Map of query type to the function names for which we trace properties used by the client builder.
 * This map only applies to the Weaviate client builder that implement the CommandBase interface i.e implement a "do" function.
 */
export const queryTypeToFunctionToProps = {
  graphql: {
    collectionName: ['className'],
    get: [
      'after', 'askString', 'bm25String', 'className', 'fields',
      'groupString', 'hybridString', 'includesNearMediaFilter', 'limit', 'nearImageNotSet',
      'nearMediaString', 'nearMediaType', 'nearObjectString', 'nearTextString', 'nearVectorString',
      'offset', 'sortString', 'whereString', 'generateString', 'consistencyLevel', 'groupByString', 'tenant', 'autocut'
    ],
    aggregate: [
      'className', 'fields', 'groupBy', 'includesNearMediaFilter', 'limit',
      'nearMediaString', 'nearMediaType', 'nearObjectString', 'nearTextString',
      'nearVectorString', 'objectLimit', 'whereString', 'tenant'
    ],
    explore: [
      'askString', 'fields', 'group', 'limit', 'includesNearMediaFilter',
      'nearMediaString', 'nearMediaType', 'nearObjectString', 'nearTextString',
      'nearVectorString', 'params'
    ],
    raw: [
      'query'
    ]
  } as const,
  schema: {
    collectionName: ['class.class', 'className'],
    classCreator: ['class.class'],
    classDeleter: ['className'],
    propertyCreator: ['className', 'property'],
    classGetter: ['className'],
    shardsGetter: ['className'],
    shardsUpdater: ['className', 'shardName', 'status', 'shards'],
    tenantsCreator: ['className', 'tenants'],
    tenantsGetter: ['className'],
    tenantsUpdater: ['className', 'tenants'],
    tenantExists: ['className', 'tenant']
  } as const,
  batch: {
    collectionName: [],
    objectsBatcher: ['consistencyLevel', 'objects'],
    referencesBatcher: ['consistencyLevel', 'beaconPath'],
    referencePayloadBuilder: ['fromClassName', 'fromId', 'fromRefProp', 'toClassName', 'toId']
  } as const
}

// Define a type that generates strings in the format "prefix.methodName.do", excluding 'collectionName'
type AllNestedMethods<T, Prefix extends string = ''> = {
  [K in keyof T]: K extends 'collectionName'
    ? never
    : T[K] extends object
      ? AllNestedMethods<T[K], `${Prefix}${K & string}.`> | `${Prefix}${K & string}.do`
      : never;
}[keyof T & string]

// Define a type that maps only the nested properties, skipping top-level keys
type NestedMethodsOnly<T> = {
  [K in keyof T]: T[K] extends object ? AllNestedMethods<T[K], `${K & string}.`> : never;
}[keyof T & string]

// Define the WeaviateMethods type using the NestedMethodsOnly type
export type WeaviateFunctions = NestedMethodsOnly<typeof queryTypeToFunctionToProps>

export const WeaviateFunctionNames = Object.entries(queryTypeToFunctionToProps).map(([operationType, operations]) => {
  return Object.entries(operations).map(([operation, methods]: [string, string[]]) => {
    if (operation === 'collectionName') return []
    return `${operationType}.${operation}.do`
  }).flat()
}).flat() as WeaviateFunctions[]
