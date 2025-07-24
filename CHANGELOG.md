# @langtrase/typescript-sdk

## 6.3.7

### Patch Changes

- Remove `sentry` reporting

## 6.3.5

### Patch Changes

- add support for `sendMessage` inside `PreviewGenerativeModel` vertexai

## 6.3.4

### Patch Changes

- change startChat span name

## 6.3.3

### Patch Changes

- add support for chatSession vertexai

- Remove duplicate @google/generative-ai dependency from devDependencies

## 6.3.2

## 6.4.0

### Patch Changes

- Add support for Arch

## 6.3.2

### Patch Changes

- Add Support for preview module inside VertexAI

## 5.4.0

### Minor Changes

- Support OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS env vars

## 5.3.2

### Patch Changes

- Add Vertex AI tools and funcition tracing support

## 5.3.1

### Patch Changes

- Fix allowing manual patch for Gemini and Vertex AI.

## 5.3.0

### Minor Changes

- Add support for Vertex AI tracing.

## 5.2.0

### Minor Changes

- Add support for Gemini tracing.

## 6.3.0

### Minor Changes

- Fix for ChromaDb

## 6.1.1

### Patch Changes

- Support for xAI

## 6.0.0

### Major Changes

- Change ingestion endpoint to app.langtrace.ai as API domain is moved to the subdomain now

## 5.4.0

### Minor Changes

- Support OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS env vars

## 5.3.2

### Patch Changes

- Add Vertex AI tools and funcition tracing support

## 5.3.1

### Patch Changes

- Fix allowing manual patch for Gemini and Vertex AI.

## 5.3.0

### Minor Changes

- Add support for Vertex AI tracing.

## 5.2.0

### Minor Changes

- Add support for Gemini tracing.

## 5.1.2

### Patch Changes

- Fix previous tiktoken fix causing same issue on nextjs

## 5.1.1

### Patch Changes

- Switch tiktoken library to make it wasm compatible

## 5.1.0

### Minor Changes

- Added support for Vercel AI Anthropic model.

## 5.0.4

### Patch Changes

- Bug fix where response_format was not following genai conventions for openai instrumentation

## 5.0.3

### Patch Changes

- Add service_name option and support for otel env var

## 5.0.2

### Patch Changes

- Remove adding chunks for streaming to events

## 5.0.1

### Patch Changes

- Fixed the gen_ai input and output token attr to proper values for openai groq.

## 5.0.0

### Major Changes

- Make attributes genai compatible and bug fixes

## 4.1.0

### Minor Changes

- Added support for vercel AI sdk and a few bug fixes

## 4.0.1

### Patch Changes

- Fix bug causing qdrant, pinecone and chroma instrumentation to fail

## 4.0.0

### Major Changes

- Migrate to OTEL conventions for LLM attributes, add support for ollama and bug fixes

## 3.3.3

### Patch Changes

- Fixed a bug causing sdk to crash if init was called multiple time. Now a warning is shown. Also fixed a bug which was skipping sampling spans incorrectly

## 3.3.2

### Patch Changes

- Export constants vendors, TracedFunctionsByVendor and their corresponding types

## 3.3.1

### Patch Changes

- Fix patch stream issue of not preserving the original object

## 3.3.0

### Minor Changes

- Add disabling tracing for functions per vendor

## 3.2.1

### Patch Changes

- Bug fix for sendUserFeedback and getPromptFrom registry for hosted setups using the wrong url.

## 3.2.0

### Minor Changes

- Add support for pg tracing, debug logging options, warn about outdated version and weaviate tracing

## 3.1.1

### Patch Changes

- Add gpt-4o support for token usage calculation

## 3.1.0

### Minor Changes

- 2a74776: Fix userfeedback causing breakages

## 3.0.1

### Patch Changes

- Fix bug causing all instrumentations being required in a nextjs project

## 3.0.0

### Major Changes

- Renamed init options for more clarity and also added the ability to pass user feedback through the sdk

## 2.2.1

### Patch Changes

- Update package json license to apache 2.0

## 2.2.0

### Minor Changes

- Add fetching prompt from registry functionality

## 2.1.1

### Patch Changes

- - Fix batch option ignored bug.
  - Includes bugfix from @cnjsstong

## 2.1.0

### Minor Changes

- Add groq and qdrant support
- Add disabling vendors option

## 2.0.2

### Patch Changes

- Remove accidently included console log

## 2.0.1

### Major Changes

- Add cohere support and instrument additional parameters for multiple vendors to get a richer cardinality

## 1.4.0

### Minor Changes

- Add nextjs support and bug fixes

## 1.3.3

- Fix for function calling response tracing
- Fix for streaming prompt calculation

## 1.3.2

- Adds 'langtrace.sdk.name' to the trace attributes

## 1.3.1

### Patch Changes

- Update readme

## 1.3.0

### Minor Changes

- 735628e: Breaks export url which has changed. Also batching is mandated when sending to langtrace cloud

## 1.2.9

### Patch Changes

- Fix function import error causing sdk to not function properly

## 1.2.8

### Patch Changes

- fb8d162: Fix withLangTraceRootSpan bug

## 1.2.7

### Patch Changes

- Bump dependency version to fix security vulnerability

## 1.2.6

### Major Changes

- Fix bugs causing failure if api key is missing despite `write_to_remote_url` being off
- Rename environment variables to better clarify usage
- README.md updates
- Fix linting in project

### Minor Changes

- 78f0988: Add more detailed README.md

### Patch Changes

- 432534b: Fix packaging issue causing import issues

## 1.1.5

### Minor Changes

- 38eb5f3: Fix version sync issue in registry and local

### Patch Changes

- 7298ecf: Fix packaging issue causing import issues

## 1.0.0

### Major Changes

- 9caeca6: First stable release of the sdk
