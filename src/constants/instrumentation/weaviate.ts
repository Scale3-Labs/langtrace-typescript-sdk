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
  },
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
  },
  batch: {
    collectionName: [],
    objectsBatcher: ['consistencyLevel', 'objects'],
    referencesBatcher: ['consistencyLevel', 'beaconPath'],
    referencePayloadBuilder: ['fromClassName', 'fromId', 'fromRefProp', 'toClassName', 'toId']
  }
}
