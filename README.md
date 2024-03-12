# What is Langtrace?

Langtrace stands as a developer-centric, open-source solution, fully compatible with OpenTelemetry. It enables developers to effortlessly trace, monitor, and debug their LLM applications, offering robust support for automatic instrumentation.

## Supported LLM Modules

Langtrace supports a comprehensive range of LLMs, VectorDBs, and frameworks, ensuring wide coverage for your development needs:

### LLMs

1. OpenAI
2. Anthropic
3. Azure OpenAI

### VectorDBs

1. Pinecone
2. Chromadb

### Frameworks

1. LangChain
2. LlamaIndex
3. Haystack

We are actively working to extend our support to additional libraries!

## Getting Started

To begin utilizing Langtrace, follow these straightforward steps:

1. Install the package using `npm i @langtrase/typescript-sdk`.
2. Incorporate Langtrace into your project with `import * as Langtrace from '@langtrase/typescript-sdk'`.
   - This import should precede any other LLM module imports (such as OpenAI, LlamaIndex, etc.) to ensure proper functionality.
3. Initialize Langtrace by adding `LangTrace.init({ write_to_remote_url: false})` to your code.
4. Congratulations, you've completed the basic setup! You will now begin to see traces from your LLM modules logged directly to the console.

## Exporting Traces to Langtrace

To configure trace exporting, you have two options:

You'll need both a Langtrace `api_key` and a `remote_url`, which can be acquired by logging into your Langtrace account.

1. Direct Initialization: Utilize `LangTrace.init({ batch: true, api_key: <YOUR_API_KEY>, remote_url: <YOUR_REMOTE_URL>})`.
2. Environment Variables: Set `LANGTRACE_API_KEY` and `LANGTRACE_URL`, then add `LangTrace.init({ batch: true })` at the beginning of your file.

## Langtrace Cloud

Currently under development 🚧
