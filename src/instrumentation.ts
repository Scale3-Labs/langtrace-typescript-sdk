import { SpanStatusCode, diag, trace } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type { OpenAI } from "openai";
import { APIPromise } from "openai/core";

class OpenAIInstrumentation extends InstrumentationBase<typeof OpenAI> {
  constructor() {
    super("@scale3/langtrace", "1.0.0");
  }

  init() {
    const module = new InstrumentationNodeModuleDefinition<typeof OpenAI>(
      "openai",
      ["^4.26.1"], // Specify the versions of the OpenAI SDK you want to instrument
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching OpenAI SDK version ${moduleVersion}`);
        this._patchCreateChatCompletion(moduleExports);
        return moduleExports;
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching OpenAI SDK version ${moduleVersion}`);
        if (moduleExports) {
          this._unpatchCreateChatCompletion(moduleExports);
        }
      }
    );

    return [module];
  }

  private _patchCreateChatCompletion(openai: typeof OpenAI) {
    if (isWrapped(openai.Chat.Completions.prototype)) {
      this._unwrap(openai.Chat.Completions.prototype, "create");
    }

    this._wrap(
      openai.Chat.Completions.prototype,
      "create",
      this._getCreateChatCompletionPatch
    );
  }

  private _unpatchCreateChatCompletion(openai: typeof OpenAI) {
    this._unwrap(openai.Chat.Completions.prototype, "create");
  }

  private _getCreateChatCompletionPatch(
    originalMethod: (...args: any[]) => any
  ): (...args: any[]) => any {
    return function (this: any, ...args: any[]) {
      const span = trace
        .getTracer("openai-sdk")
        .startSpan("OpenAI Create Chat Completion");
      // Preserving `this` from the calling context
      const originalContext = this;

      span.setAttribute("args", JSON.stringify(args));

      return new Promise((resolve, reject) => {
        originalMethod
          .apply(originalContext, args) // Use `originalContext` here
          .then((result: any) => {
            span.setAttribute("result", JSON.stringify(result));
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            resolve(result);
          })
          .catch((error: any) => {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            span.end();
            reject(error);
          });
      }) as APIPromise<OpenAI.Completions.Completion>;
    };
  }
}

export const openAIInstrumentation = new OpenAIInstrumentation();
