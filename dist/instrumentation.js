"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIInstrumentation = void 0;
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
class OpenAIInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor() {
        super("@scale3/langtrace", "1.0.0");
    }
    init() {
        const module = new instrumentation_1.InstrumentationNodeModuleDefinition("openai", ["^4.26.1"], // Specify the versions of the OpenAI SDK you want to instrument
        (moduleExports, moduleVersion) => {
            api_1.diag.debug(`Patching OpenAI SDK version ${moduleVersion}`);
            this._patchCreateChatCompletion(moduleExports);
            return moduleExports;
        }, (moduleExports, moduleVersion) => {
            api_1.diag.debug(`Unpatching OpenAI SDK version ${moduleVersion}`);
            if (moduleExports) {
                this._unpatchCreateChatCompletion(moduleExports);
            }
        });
        return [module];
    }
    _patchCreateChatCompletion(openai) {
        if ((0, instrumentation_1.isWrapped)(openai.Chat.Completions.prototype)) {
            this._unwrap(openai.Chat.Completions.prototype, "create");
        }
        this._wrap(openai.Chat.Completions.prototype, "create", this._getCreateChatCompletionPatch);
    }
    _unpatchCreateChatCompletion(openai) {
        this._unwrap(openai.Chat.Completions.prototype, "create");
    }
    _getCreateChatCompletionPatch(originalMethod) {
        return function (...args) {
            const span = api_1.trace
                .getTracer("Langtrace OpenAI SDK")
                .startSpan("OpenAI: chat.completion.create");
            // Preserving `this` from the calling context
            const originalContext = this;
            span.setAttribute("args", JSON.stringify(args));
            return new Promise((resolve, reject) => {
                originalMethod
                    .apply(originalContext, args) // Use `originalContext` here
                    .then((result) => {
                    span.setAttribute("result", JSON.stringify(result));
                    span.setStatus({ code: api_1.SpanStatusCode.OK });
                    span.end();
                    resolve(result);
                })
                    .catch((error) => {
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: error.message,
                    });
                    span.end();
                    reject(error);
                });
            });
        };
    }
}
exports.openAIInstrumentation = new OpenAIInstrumentation();
