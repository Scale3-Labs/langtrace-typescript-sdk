import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type { Pinecone } from "@pinecone-database/pinecone";
import { genericPatch } from "./patch";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
class PineconeInstrumentation extends InstrumentationBase<any> {
  constructor() {
    super("@langtrase/node-sdk", "1.0.0");
  }

  init(): InstrumentationModuleDefinition<typeof Pinecone>[] {
    const module = new InstrumentationNodeModuleDefinition<typeof Pinecone>(
      "@pinecone-database/pinecone",
      [">=2.0.0"],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Pinecone SDK version ${moduleVersion}`);
        this._patch(moduleExports);
        return moduleExports;
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Pinecone SDK version ${moduleVersion}`);
        if (moduleExports) {
          this._unpatch(moduleExports);
        }
      }
    );

    return [module];
  }

  private _patch(pinecone: any) {
    if (isWrapped(pinecone.Index.prototype)) {
      this._unwrap(pinecone.Index.prototype, "upsert");
      this._unwrap(pinecone.Index.prototype, "query");
    }

    this._wrap(
      pinecone.Index.prototype,
      "upsert",
      (originalMethod: (...args: any[]) => any) =>
        genericPatch(originalMethod, "upsert")
    );
    this._wrap(
      pinecone.Index.prototype,
      "query",
      (originalMethod: (...args: any[]) => any) =>
        genericPatch(originalMethod, "query")
    );
    this._wrap(
      pinecone.Index.prototype,
      "deleteOne",
      (originalMethod: (...args: any[]) => any) =>
        genericPatch(originalMethod, "deleteOne")
    );
    this._wrap(
      pinecone.Index.prototype,
      "deleteMany",
      (originalMethod: (...args: any[]) => any) =>
        genericPatch(originalMethod, "deleteMany")
    );
  }

  private _unpatch(pinecone: any) {
    this._unwrap(pinecone.Index.prototype, "upsert");
    this._unwrap(pinecone.Index.prototype, "query");
  }
}

export const pineconeInstrumentation = new PineconeInstrumentation();
