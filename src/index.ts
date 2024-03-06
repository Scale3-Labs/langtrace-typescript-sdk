
// Import the necessary modules
import { init } from '@langtrace-init/init';
import { LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types';
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation';

// Create the LangTrace namespace and export the imported functions under it
const LangTrace = {
  init,
  withLangTraceRootSpan,
};

export { LangTrace, LangTraceInit, LangtraceInitOptions};