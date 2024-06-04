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

// Define a type that recursively maps over all properties, generating strings in the format "prefix.propertyName"
// Ignores 'collectionName' properties
type AllNestedProperties<T, Prefix extends string = ''> = {
  [K in keyof T]: K extends 'collectionName' // Check if the key is 'collectionName'
    ? never // Ignore 'collectionName'
    : T[K] extends readonly string[] // Check if the value is a readonly array of strings
      ? `${Prefix}${K & string}.${T[K][number]}` // Map each string in the array to "prefix.propertyName"
      : T[K] extends object // Check if the value is an object
        ? `${Prefix}${K & string}` | AllNestedProperties<T[K], `${Prefix}${K & string}.`> // Recursively map properties
        : never; // Otherwise, return never
}[keyof T & string] // Ensure the key is treated as a string

export type WeaviateMethods = AllNestedProperties< typeof queryTypeToFunctionToProps>
