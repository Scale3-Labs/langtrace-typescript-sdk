# [Langtrace](https://www.langtrace.ai)

## Open Source & Open Telemetry(OTEL) Observability for LLM applications

![Static Badge](https://img.shields.io/badge/License-Apache--2.0-blue) ![Static Badge](https://img.shields.io/badge/npm_@langtrase/typescript--sdk-1.2.9-green) ![Static Badge](https://img.shields.io/badge/pip_langtrace--python--sdk-1.2.8-green) ![Static Badge](https://img.shields.io/badge/Development_status-Active-green)

---

Langtrace is an open source observability software which lets you capture, debug and analyze traces and metrics from all your applications that leverages LLM APIs, Vector Databases and LLM based Frameworks.

## Open Telemetry Support

The traces generated by Langtrace adhere to [Open Telemetry Standards(OTEL)](https://opentelemetry.io/docs/concepts/signals/traces/). We are developing [semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/) for the traces generated by this project. You can checkout the current definitions in [this repository](https://github.com/Scale3-Labs/langtrace-trace-attributes/tree/main/schemas). Note: This is an ongoing development and we encourage you to get involved and welcome your feedback.

---

## Langtrace Cloud ☁️

To use the managed SaaS version of Langtrace, follow the steps below:

1. Sign up by going to [this link](https://langtrace.ai).
2. Create a new Project after signing up. Projects are containers for storing traces and metrics generated by your application. If you have only one application, creating 1 project will do.
3. Generate an API key by going inside the project.
4. In your application, install the Langtrace SDK and initialize it with the API key you generated in the step 3.
5. The code for installing and setting up the SDK is shown below

## Getting Started

Get started by adding simply three lines to your code!

``` typescript
npm i @langtrase/typescript-sdk
```

``` typescript
import * as Langtrace from '@langtrase/typescript-sdk' // Must precede any llm module imports
Langtrace.init({ api_key: <your_api_key> })
```

OR

``` typescript
import * as Langtrace from '@langtrase/typescript-sdk' // Must precede any llm module imports
LangTrace.init() // LANGTRACE_API_KEY as an ENVIRONMENT variable
```

## Langtrace Self Hosted

Get started by adding simply two lines to your code and see traces being logged to the console!

``` typescript
npm i @langtrase/typescript-sdk
```

``` typescript
import * as Langtrace from '@langtrase/typescript-sdk' // Must precede any llm module imports
Langtrace.init({ write_spans_to_console: true, api_host: '<HOSTED_URL>/api/trace'})
```

## Langtrace self hosted custom exporter

Get started by adding simply three lines to your code and see traces being exported to your remote location!

``` typescript
npm i @langtrase/typescript-sdk
```

``` typescript
import * as Langtrace from '@langtrase/typescript-sdk' // Must precede any llm module imports
Langtrace.init({ custom_remote_exporter: <your_exporter>, batch:<true or false>})
```

## Additional Customization

- [withLangTraceRootSpan](https://docs.langtrace.ai/features/grouptraces) - this function is designed to organize and relate different spans, in a hierarchical manner. When you're performing multiple operations that you want to monitor together as a unit, this function helps by establishing a "parent" (`LangtraceRootSpan` or whatever is passed to `name`) span. Then, any calls to the LLM APIs made within the given function (fn) will be considered "children" of this parent span. This setup is especially useful for tracking the performance or behavior of a group of operations collectively, rather than individually. See [example](https://docs.langtrace.ai/features/grouptraces)

``` typescript
 /**
 * @param fn  The function to be executed within the context of the root span. The function should accept the spanId and traceId as arguments
 * @param name Name of the root span
 * @param spanAttributes Attributes to be added to the root span
 * @param spanKind The kind of span to be created
 * @returns result of the function
 */
export async function withLangTraceRootSpan<T> (
  fn: (spanId: string, traceId: string) => Promise<T>,
  name = 'LangtraceRootSpan',
  spanKind: SpanKind = SpanKind.INTERNAL
): Promise<T>
```

- [withAdditionalAttributes](https://docs.langtrace.ai/features/additional_attributes) - this function is designed to enhance the traces by adding custom attributes to the current context. These custom attributes provide extra details about the operations being performed, making it easier to analyze and understand their behavior. See [example](https://docs.langtrace.ai/features/additional_attributes)

``` typescript
/**
 *
 * @param fn function to be executed within the context with the custom attributes added to the current context
 * @param attributes custom attributes to be added to the current context.
 * Attributes can also be an awaited Promise<Record<string, any>>. E.g withAdditionalAttributes(()=>{// Do something}, await getAdditionalAttributes()) // Assuming you have a function called getAdditionalAttributes defined in your code
 * @returns result of the function
 */
export async function withAdditionalAttributes <T> (fn: () => Promise<T>, attributes: Record<string, any> | Promise<Record<string, any>>): Promise<T>
```

- [getPromptFromRegistry](https://docs.langtrace.ai/features/manage_prompts) - Fetches either the latest prompt from the prompt registry or a specific version passed in through `options`. See [example](https://docs.langtrace.ai/features/manage_prompts)

```typescript
/**
 * Fetches a prompt from the registry.
 *
 * @param promptRegistryId - The ID of the prompt registry.
 * @param options - Configuration options for fetching the prompt:
 *    - `prompt_version` - Fetches the prompt with the specified version. If not provided, the live prompt will be fetched. If there is no live prompt, an error will be thrown.
 *    - `variables`: - Replaces the variables in the prompt with the provided values. Each key of the object should be the variable name, and the corresponding value should be the value to replace.
 * @returns LangtracePrompt - The fetched prompt with variables replaced as specified.
 */
export const getPromptFromRegistry = async (promptRegistryId: string, options?: { prompt_version?: number, variables?: Record<string, string> }): Promise<LangtracePrompt>
```

- [sendUserFeedback](https://docs.langtrace.ai/features/traceuserfeedback) - Allows submission of feedback on a users LLM interaction. This function must be used in tandem with the `withLangtraceRootSpan` function. See [example](https://docs.langtrace.ai/features/traceuserfeedback)

``` typescript
/**
 *
 * @param userId id of the user giving feedback
 * @param score score of the feedback
 * @param traceId traceId of the llm interaction. This is available when the inteaction is wrapped in withLangtraceRootSpan
 * @param spanId spanId of the llm interaction. This is available when the inteaction is wrapped in withLangtraceRootSpan
 *
 */
export const sendUserFeedback = async ({ userId, userScore, traceId, spanId }: EvaluationAPIData): Promise<void>
```

## Supported integrations

Langtrace automatically captures traces from the following vendors:

| Vendor       | Type            | Typescript SDK     | Python SDK                      |
| ------------ | --------------- | ------------------ | ------------------------------- |
| OpenAI       | LLM             | :white_check_mark: | :white_check_mark:              |
| Anthropic    | LLM             | :white_check_mark: | :white_check_mark:              |
| Azure OpenAI | LLM             | :white_check_mark: | :white_check_mark:              |
| Cohere       | LLM             | :white_check_mark: | :white_check_mark:              |
| Groq         | LLM             | :x:                | :white_check_mark:              |
| Perplexity   | LLM             | :white_check_mark: | :white_check_mark:              |
| Langchain    | Framework       | :x:                | :white_check_mark:              |
| LlamaIndex   | Framework       | :white_check_mark: | :white_check_mark:              |
| Langgraph    | Framework       | :x:                | :white_check_mark:              |
| DSPy         | Framework       | :x:                | :white_check_mark:              |
| CrewAI       | Framework       | :x:                | :white_check_mark:              |
| Ollama       | Framework       | :white_check_mark: | :white_check_mark:              |
| Pinecone     | Vector Database | :white_check_mark: | :white_check_mark:              |
| ChromaDB     | Vector Database | :white_check_mark: | :white_check_mark:              |
| QDrant       | Vector Database | :white_check_mark: | :white_check_mark:              |
| Weaviate     | Vector Database | :white_check_mark: | :white_check_mark:              |
| PGVector     | Vector Database | :white_check_mark: | :white_check_mark: (SQLAlchemy) |

## Feature Requests and Issues

- To request for features, head over [here to start a discussion](https://github.com/Scale3-Labs/langtrace/discussions/categories/feature-requests).
- To raise an issue, head over [here and create an issue](https://github.com/Scale3-Labs/langtrace/issues).

---

## Contributions

We welcome contributions to this project. To get started, fork this repository and start developing. To get involved, join our [Discord](https://discord.langtrace.ai) workspace.

---

## Security

To report security vulnerabilites, email us at <security@scale3labs.com>. You can read more on security [here](https://github.com/Scale3-Labs/langtrace/blob/development/SECURITY.md).

---

## License

- Langtrace application is [licensed](https://github.com/Scale3-Labs/langtrace/blob/development/LICENSE) under the AGPL 3.0 License. You can read about this license [here](https://www.gnu.org/licenses/agpl-3.0.en.html).
- Langtrace SDKs are licensed under the Apache 2.0 License. You can read about this license [here](https://www.apache.org/licenses/LICENSE-2.0).
