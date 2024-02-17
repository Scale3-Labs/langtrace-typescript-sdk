import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type * as ChainsModule from "langchain/chains";
import { recursiveCharacterTextSplitterHandler } from "./patch_text_splitter";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
class LangchainInstrumentation extends InstrumentationBase<any> {
  constructor() {
    super("@langtrase/node-sdk", "1.0.0");
  }

  init(): InstrumentationModuleDefinition<any>[] {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "langchain/chains",
      [">=0.1.16"],
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

  private _patch(moduleExports: typeof ChainsModule) {
    if (isWrapped(moduleExports.ConversationChain.prototype)) {
      this._unwrap(moduleExports.ConversationChain.prototype, "call");
    }

    this._wrap(
      moduleExports.ConversationChain.prototype,
      "call",
      recursiveCharacterTextSplitterHandler
    );
  }

  private _unpatch(moduleExports: typeof ChainsModule) {
    this._unwrap(moduleExports.ConversationChain.prototype, "call");
  }
}

export const langchainInstrumentation = new LangchainInstrumentation();
