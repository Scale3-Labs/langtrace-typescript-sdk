import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type { Pinecone } from "@pinecone-database/pinecone";
import { APIS } from "./apis";
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
        this._patch(moduleExports, moduleVersion as string);
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

  private _patch(pinecone: any, version: string) {
    if (isWrapped(pinecone.Index.prototype)) {
      Object.keys(APIS).forEach((api) => {
        this._unwrap(pinecone.Index.prototype, APIS[api].OPERATION);
      });
    }

    Object.keys(APIS).forEach((api) => {
      this._wrap(
        pinecone.Index.prototype,
        APIS[api].OPERATION,
        (originalMethod: (...args: any[]) => any) =>
          genericPatch(originalMethod, api, this.tracer, version)
      );
    });
  }

  private _unpatch(pinecone: any) {
    Object.keys(APIS).forEach((api) => {
      this._unwrap(pinecone.Index.prototype, APIS[api].OPERATION);
    });
  }
}

export const pineconeInstrumentation = new PineconeInstrumentation();
