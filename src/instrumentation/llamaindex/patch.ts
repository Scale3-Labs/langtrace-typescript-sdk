import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { QuestionsAnsweredExtractor, TitleExtractor } from "llamaindex";
import { TRACE_NAMESPACES } from "../../constants";
import { LlamaIndexSpanAttributes } from "./lib/span_attributes";

export function ingestionPipelinePatch(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    // Start a new span
    const span = trace
      .getTracer(TRACE_NAMESPACES.LLAMAINDEX)
      .startSpan("IngestionPipeline.run", {
        attributes: {
          [LlamaIndexSpanAttributes.TRANSFORMATIONS]: JSON.stringify(
            extractTransformationsFromPipeline(originalContext.transformations)
          ),
        },
        kind: SpanKind.CLIENT,
      });

    // Wrap the original method in a try/catch block
    try {
      // Call the original create method
      const response = await originalMethod.apply(originalContext, args);

      // Set the span status and end the span
      span.setAttribute(
        "response.responses",
        JSON.stringify(response.map((r: any) => r.metadata))
      );
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return response;
    } catch (error: any) {
      // If an error occurs, record the exception and end the span
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  };
}

export function queryEnginePatch(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    // Start a new span
    const span = trace
      .getTracer(TRACE_NAMESPACES.LLAMAINDEX)
      .startSpan("queryEngine.query", {
        attributes: {},
        kind: SpanKind.CLIENT,
      });

    console.log(originalContext.transformations[0].llm);
    console.log("----");
    console.log(args);

    // Wrap the original method in a try/catch block
    try {
      // Call the original create method
      const response = await originalMethod.apply(originalContext, args);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return response;
    } catch (error: any) {
      // If an error occurs, record the exception and end the span
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  };
}

function extractTransformationsFromPipeline(transformations: any) {
  return transformations.map((t: any) => {
    if (t instanceof TitleExtractor) {
      return extractTitleExtractor(t);
    } else if (t instanceof QuestionsAnsweredExtractor) {
      return extractQuestionsAnsweredExtractor(t);
    }
  });
}

interface QuestionsAnsweredExtractorTrace {
  disableTemplateRewrite: boolean;
  questions: number;
  promptTemplate: string;
  llm: LLMTrace;
}

function extractQuestionsAnsweredExtractor(
  questionsansweredExtractor: QuestionsAnsweredExtractor
) {
  const result = {} as QuestionsAnsweredExtractorTrace;
  if (questionsansweredExtractor.disableTemplateRewrite) {
    result["disableTemplateRewrite"] =
      questionsansweredExtractor.disableTemplateRewrite;
  }
  if (questionsansweredExtractor.questions) {
    result["questions"] = questionsansweredExtractor.questions;
  }
  if (questionsansweredExtractor.promptTemplate) {
    result["promptTemplate"] = questionsansweredExtractor.promptTemplate;
  }
  if (questionsansweredExtractor.llm) {
    result["llm"] = extractLlmFromTransformation(
      questionsansweredExtractor.llm
    );
  }
  return result;
}

interface TitleExtractorTrace {
  nodeTemplate: string;
  llm: LLMTrace;
}

function extractTitleExtractor(titleExtractor: TitleExtractor) {
  const result = {} as TitleExtractorTrace;
  if (titleExtractor.nodeTemplate) {
    result["nodeTemplate"] = titleExtractor.nodeTemplate;
  }
  if (titleExtractor.llm) {
    result["llm"] = extractLlmFromTransformation(titleExtractor.llm);
  }
  return result;
}

interface LLMTrace {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  maxRetries: number;
  timeout: number;
}

function extractLlmFromTransformation(llm: any) {
  const result = {} as LLMTrace;
  if (llm.model) {
    result["model"] = llm.model;
  }
  if (llm.temperature) {
    result["temperature"] = llm.temperature;
  }
  if (llm.topP) {
    result["topP"] = llm.topP;
  }
  if (llm.maxTokens) {
    result["maxTokens"] = llm.maxTokens;
  }
  if (llm.maxRetries) {
    result["maxRetries"] = llm.maxRetries;
  }
  if (llm.timeout) {
    result["timeout"] = llm.timeout;
  }
  return result;
}
