import {
  DiagConsoleLogger,
  DiagLogLevel,
  SpanKind,
  diag,
  trace,
} from "@opentelemetry/api";
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped,
} from "@opentelemetry/instrumentation";
import type { Collection } from "chromadb";
import { TRACE_NAMESPACES } from "../../constants";
import { APIS } from "./lib/apis";
import { collectionPatch } from "./patch";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
class ChromaInstrumentation extends InstrumentationBase<any> {
  constructor() {
    super("@langtrase/node-sdk", "1.0.0");
  }

  init(): InstrumentationModuleDefinition<typeof Collection>[] {
    const module = new InstrumentationNodeModuleDefinition<typeof Collection>(
      "chromadb",
      [">=1.8.1"],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching ChromaDB SDK version ${moduleVersion}`);
        this._patch(moduleExports);
        return moduleExports;
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching ChromaDB SDK version ${moduleVersion}`);
        if (moduleExports) {
          this._unpatch(moduleExports);
        }
      }
    );

    return [module];
  }

  private _patch(chromadb: any) {
    if (isWrapped(chromadb.Collection.prototype)) {
      Object.keys(APIS).forEach((api) => {
        this._unwrap(chromadb.Collection.prototype, APIS[api].OPERATION);
      });
    }

    const tracer = trace.getTracer(TRACE_NAMESPACES.CHROMA);
    const rootSpan = tracer.startSpan("langtrace.reference", {
      kind: SpanKind.INTERNAL,
      attributes: {
        "span.type": "reference",
        "span.kind": "internal",
        "span.purpose": "parent span to trace all Chroma operations",
      },
    });
    rootSpan.end();
    Object.keys(APIS).forEach((api) => {
      this._wrap(
        chromadb.Collection.prototype,
        APIS[api].OPERATION,
        (originalMethod: (...args: any[]) => any) =>
          collectionPatch(originalMethod, api, tracer, rootSpan)
      );
    });
  }

  private _unpatch(chromadb: any) {
    Object.keys(APIS).forEach((api) => {
      this._unwrap(chromadb.Collection.prototype, APIS[api].OPERATION);
    });
  }
}

export const chromaInstrumentation = new ChromaInstrumentation();
