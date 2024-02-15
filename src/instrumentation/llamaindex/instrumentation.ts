import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type * as llamaindex from "llamaindex";
import { ingestionPipelinePatch, queryEnginePatch } from "./patch";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
class LlamaIndexInstrumentation extends InstrumentationBase<any> {
  constructor() {
    super("@scale3/langtrace", "1.0.0");
  }

  init(): InstrumentationModuleDefinition<typeof llamaindex>[] {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "llamaindex",
      [">=0.1.10"],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching LlamaIndex SDK version ${moduleVersion}`);
        this._patch(moduleExports);
        return moduleExports;
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching LlamaIndex SDK version ${moduleVersion}`);
        if (moduleExports) {
          this._unpatch(moduleExports);
        }
      }
    );

    return [module];
  }

  private _patch(llama: typeof llamaindex) {
    if (isWrapped(llama.IngestionPipeline.prototype)) {
      this._unwrap(llama.IngestionPipeline.prototype, "run");
    }
    if (isWrapped(llama.RetrieverQueryEngine.prototype)) {
      this._unwrap(llama.RetrieverQueryEngine.prototype, "query");
    }

    this._wrap(
      llama.IngestionPipeline.prototype,
      "run",
      (originalMethod: (...args: any[]) => any) =>
        ingestionPipelinePatch(originalMethod)
    );

    this._wrap(
      llama.RetrieverQueryEngine.prototype,
      "query",
      (originalMethod: (...args: any[]) => any) =>
        queryEnginePatch(originalMethod)
    );
  }

  private _unpatch(llama: typeof llamaindex) {
    this._unwrap(llama.IngestionPipeline.prototype, "run");
    this._unwrap(llama.RetrieverQueryEngine.prototype, "query");
  }
}

export const llamaIndexInstrumentation = new LlamaIndexInstrumentation();
