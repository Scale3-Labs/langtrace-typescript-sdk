// import { diag } from "@opentelemetry/api";
// import {
//   InstrumentationBase,
//   InstrumentationNodeModuleDefinition,
//   isWrapped,
// } from "@opentelemetry/instrumentation";

// class LangchainInstrumentation extends InstrumentationBase<any> {
//   constructor() {
//     super("@scale3/langtrace", "1.0.0");
//   }

//   init() {
//     const module = new InstrumentationNodeModuleDefinition<any>(
//       "langchain",
//       [">=0.1.17"],
//       (moduleExports, moduleVersion) => {
//         diag.debug(`Patching Langchain SDK version ${moduleVersion}`);
//         this._patch(moduleExports);
//         return moduleExports;
//       },
//       (moduleExports, moduleVersion) => {
//         diag.debug(`Unpatching Langchain SDK version ${moduleVersion}`);
//         if (moduleExports) {
//           this._unpatch(moduleExports);
//         }
//       }
//     );

//     return [module];
//   }

//   private _patch(langchain: any) {
//     if (isWrapped(openai.Chat.Completions.prototype)) {
//       this._unwrap(openai.Chat.Completions.prototype, "create");
//     } else if (isWrapped(openai.Images.prototype)) {
//       this._unwrap(openai.Images.prototype, "generate");
//     }

//     this._wrap();
//   }

//   private _unpatch(langchain: any) {
//     this._unwrap();
//   }
// }

// export const langchainInstrumentation = new LangchainInstrumentation();
