import * as originalModule from 'ai'

// Create a wrapper object. This is necessary because the original module has properties that are read-only
const ai = Object.assign({}, originalModule)

// Export the wrapper object
export default ai
