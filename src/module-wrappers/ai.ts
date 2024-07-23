// eslint-disable-next-line @typescript-eslint/no-var-requires
const originalModule = require('ai')
// Create a wrapper object. This is necessary because the original module has properties that are read-only
const ai = Object.assign({}, originalModule)

// Support commonjs import
module.exports = ai
// Support es6 import
export default ai
