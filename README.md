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
3. Initialize Langtrace by adding `LangTrace.init({ write_to_langtrace_cloud: false, batch: false})` to your code.
4. Congratulations, you've completed the basic setup! You will now begin to see traces from your LLM modules logged directly to the console.

## Exporting Traces to Langtrace

To configure trace exporting, you have two options:

You'll need a Langtrace `api_key`, which can be acquired by logging into your Langtrace account.

1. Direct Initialization: Utilize `LangTrace.init({ api_key: <YOUR_API_KEY>})`.
2. Environment Variables: Set `LANGTRACE_API_KEY`, then add `LangTrace.init()` at the beginning of your file.

### Additional Customization

- `WithLangTraceRootSpan` - this function is designed to organize and relate different spans, in a hierarchical manner. When you're performing multiple operations that you want to monitor together as a unit, this function helps by establishing a "parent" (`LangtraceRootSpan` or whatever is passed to `name`) span. Then, any calls to the LLM APIs made within the given function (fn) will be considered "children" of this parent span. This setup is especially useful for tracking the performance or behavior of a group of operations collectively, rather than individually.

``` typescript
 *
 * @param fn  The function to be executed within the context of the root span
 * @param name Name of the root span
 * @param spanAttributes Attributes to be added to the root span
 * @param spanKind The kind of span to be created
 * @returns result of the function
 */
export async function withLangTraceRootSpan<T> (
  fn: () => Promise<T>,
  name = 'LangtraceRootSpan',
  spanKind: SpanKind = SpanKind.INTERNAL
): Promise<T>
```

- `withAdditionalAttributes` - this function is designed to enhance the traces by adding custom attributes to the current context. These custom attributes provide extra details about the operations being performed, making it easier to analyze and understand their behavior.

``` typescript
/**
 *
 * @param fn function to be executed within the context with the custom attributes added to the current context
 * @param attributes custom attributes to be added to the current context
 * @returns result of the function
 */
export async function withAdditionalAttributes <T> (fn: () => Promise<T>, attributes: Partial<LLMSpanAttributes>): Promise<T>

```

## Langtrace Cloud

Currently under development 🚧
