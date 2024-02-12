import { diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type { OpenAI } from "openai";
import { chatCompletionCreate, imagesGenerate } from "./patch";

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
    }

    this._wrap(
      openai.Chat.Completions.prototype,
      "create",
      chatCompletionCreate
    );
    this._wrap(openai.Images.prototype, "generate", imagesGenerate);
  }

  private _unpatch(openai: typeof OpenAI) {
    this._unwrap(openai.Chat.Completions.prototype, "create");
    this._unwrap(openai.Images.prototype, "generate");
  }
}

export const openAIInstrumentation = new OpenAIInstrumentation();
