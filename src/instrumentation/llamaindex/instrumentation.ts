import { LlamaIndexMethods } from "@langtrase/trace-attributes";
import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import * as llamaindex from "llamaindex";
import { genericPatch } from "./patch";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
class LlamaIndexInstrumentation extends InstrumentationBase<any> {
  constructor() {
    super("@langtrase/node-sdk", "1.0.0");
  }

  init(): InstrumentationModuleDefinition<typeof llamaindex>[] {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "llamaindex",
      [">=0.1.10"],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching LlamaIndex SDK version ${moduleVersion}`);
        this._patch(moduleExports, moduleVersion as string);
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

  private _patch(llama: typeof llamaindex, version: string) {
    // Note: Instrumenting only the core concepts of LlamaIndex SDK
    // https://github.com/run-llama/LlamaIndexTS?tab=readme-ov-file
    for (let key in llama) {
      const cls = (llama as any)[key];
      if (cls.prototype) {
        if (
          (cls.prototype as llamaindex.RetrieverQueryEngine).query !==
            undefined ||
          (cls.prototype as llamaindex.RouterQueryEngine).query !== undefined ||
          (cls.prototype as llamaindex.SubQuestionQueryEngine).query !==
            undefined
        ) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "query");
          }
          this._wrap(
            cls.prototype,
            "query",
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                LlamaIndexMethods.QUERYENGINE_QUERY,
                "query",
                this.tracer,
                version
              )
          );
        }
        if (
          (cls.prototype as llamaindex.BaseRetriever).retrieve !== undefined
        ) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "retrieve");
          }
          this._wrap(
            cls.prototype,
            "retrieve",
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                LlamaIndexMethods.RETRIEVER_RETRIEVE,
                "retrieve",
                this.tracer,
                version
              )
          );
        }
        if ((cls.prototype as llamaindex.ChatEngine).chat !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "chat");
          }
          this._wrap(
            cls.prototype,
            "chat",
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                LlamaIndexMethods.CHATENGINE_EXTRACT,
                "chat",
                this.tracer,
                version
              )
          );
        }
        if ((cls.prototype as llamaindex.SimplePrompt).call !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "call");
          }
          this._wrap(
            cls.prototype,
            "call",
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                LlamaIndexMethods.SIMPLEPROMPT_CALL,
                "promptcall",
                this.tracer,
                version
              )
          );
        }
        if ((cls.prototype as llamaindex.BaseExtractor).extract !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "extract");
          }
          this._wrap(
            cls.prototype,
            "extract",
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                LlamaIndexMethods.BASEEXTRACTOR_EXTRACT,
                "extractdata",
                this.tracer,
                version
              )
          );
        }
        if ((cls.prototype as llamaindex.BaseReader).loadData !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "loadData");
          }
          this._wrap(
            cls.prototype,
            "loadData",
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                LlamaIndexMethods.BASEREADER_LOADDATA,
                "loaddata",
                this.tracer,
                version
              )
          );
        }
      }
    }
  }

  private _unpatch(llama: typeof llamaindex) {
    for (let key in llama) {
      const cls = (llama as any)[key];
      if (cls.prototype) {
        if (
          (cls.prototype as llamaindex.RetrieverQueryEngine).query !==
            undefined ||
          (cls.prototype as llamaindex.RouterQueryEngine).query !== undefined ||
          (cls.prototype as llamaindex.SubQuestionQueryEngine).query !==
            undefined
        ) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "query");
          }
        }
        if (
          (cls.prototype as llamaindex.BaseRetriever).retrieve !== undefined
        ) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "retrieve");
          }
        }
        if ((cls.prototype as llamaindex.ChatEngine).chat !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "chat");
          }
        }
        if ((cls.prototype as llamaindex.SimplePrompt).call !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "call");
          }
        }
        if ((cls.prototype as llamaindex.BaseExtractor).extract !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, "extract");
          }
        }
      }
    }
  }
}

export const llamaIndexInstrumentation = new LlamaIndexInstrumentation();
