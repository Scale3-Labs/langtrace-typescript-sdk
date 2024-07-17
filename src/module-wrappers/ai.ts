// eslint-disable-next-line @typescript-eslint/no-var-requires
const originalModule = require('ai')
// Create a wrapper object. This is necessary because the original module has properties that are read-only
const ai = Object.assign({}, originalModule)

// Export the wrapper object
export default ai
