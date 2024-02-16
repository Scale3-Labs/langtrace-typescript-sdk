import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type { ConversationChain } from "langchain/chains";
import { recursiveCharacterTextSplitterHandler } from "./patch_text_splitter";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
class LangchainInstrumentation extends InstrumentationBase<any> {
  constructor() {
    super("@langtrase/node-sdk", "1.0.0");
  }

  init(): InstrumentationModuleDefinition<typeof ConversationChain>[] {
    const module = new InstrumentationNodeModuleDefinition<
      typeof ConversationChain
    >(
      "langchain/chains",
      [">=0.1.6"],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Langchain SDK version ${moduleVersion}`);
        this._patch(moduleExports);
        return moduleExports;
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Langchain SDK version ${moduleVersion}`);
        if (moduleExports) {
          this._unpatch(moduleExports);
        }
      }
    );

    return [module];
  }

  private _patch(moduleExports: typeof ConversationChain) {
    console.log("patching");
    console.log(moduleExports);
    if (isWrapped(moduleExports.prototype)) {
      this._unwrap(moduleExports.prototype, "call");
    }

    this._wrap(
      moduleExports.prototype,
      "call",
      recursiveCharacterTextSplitterHandler
    );
  }

  private _unpatch(moduleExports: typeof ConversationChain) {
    console.log("unpatching");
    console.log(moduleExports);
    this._unwrap(moduleExports.prototype, "call");
  }
}

export const langchainInstrumentation = new LangchainInstrumentation();
