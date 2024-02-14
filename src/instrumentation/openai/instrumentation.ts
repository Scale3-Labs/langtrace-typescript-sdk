import { diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type { OpenAI } from "openai";
import {
  chatCompletionCreate,
  embeddingsCreate,
  imagesGenerate,
} from "./patch";

class OpenAIInstrumentation extends InstrumentationBase<typeof OpenAI> {
  constructor() {
    super("@scale3/langtrace", "1.0.0");
  }

  init() {
    const module = new InstrumentationNodeModuleDefinition<typeof OpenAI>(
      "openai",
      [">=4.26.1 <6.0.0"],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching OpenAI SDK version ${moduleVersion}`);
        this._patch(moduleExports);
        return moduleExports;
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching OpenAI SDK version ${moduleVersion}`);
        if (moduleExports) {
          this._unpatch(moduleExports);
        }
      }
    );

    return [module];
  }

  private _patch(openai: typeof OpenAI) {
    if (isWrapped(openai.Chat.Completions.prototype)) {
      this._unwrap(openai.Chat.Completions.prototype, "create");
    } else if (isWrapped(openai.Images.prototype)) {
      this._unwrap(openai.Images.prototype, "generate");
    } else if (isWrapped(openai.Embeddings.prototype)) {
      this._unwrap(openai.Embeddings.prototype, "create");
    }

    this._wrap(
      openai.Chat.Completions.prototype,
      "create",
      chatCompletionCreate
    );
    this._wrap(openai.Images.prototype, "generate", imagesGenerate);
    this._wrap(openai.Embeddings.prototype, "create", embeddingsCreate);
  }

  private _unpatch(openai: typeof OpenAI) {
    this._unwrap(openai.Chat.Completions.prototype, "create");
    this._unwrap(openai.Images.prototype, "generate");
    this._unwrap(openai.Embeddings.prototype, "create");
  }
}

export const openAIInstrumentation = new OpenAIInstrumentation();
