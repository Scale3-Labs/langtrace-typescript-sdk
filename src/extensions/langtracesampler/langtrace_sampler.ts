import { TracedFunctions } from '@langtrace-init/types'
import { SpanKind, Attributes, Context, trace, TraceFlags, diag } from '@opentelemetry/api'
import { Sampler, SamplingDecision, SamplingResult } from '@opentelemetry/sdk-trace-base'

export class LangtraceSampler implements Sampler {
  private readonly _disabled_function_names: Set<string>

  constructor (disabled_functions: Partial<TracedFunctions> | undefined) {
    this._disabled_function_names = new Set<string>()
    for (const key in disabled_functions) {
      if (disabled_functions[key as keyof typeof disabled_functions] !== undefined) {
        const functions = (disabled_functions[key as keyof typeof disabled_functions] as string[])
        functions.forEach((method) => {
          this._disabled_function_names.add(method)
        })
      }
    }
  }

  shouldSample (
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes
  ): SamplingResult {
    // Check if the span name is in the list of method names to skip
    if (this._disabled_function_names.has(spanName)) {
      diag.info('Skipping sampling span(s) related to %s as it\'s disabled', spanName)
      return { decision: SamplingDecision.NOT_RECORD }
    }
    // Check the specific attribute
    if (attributes['langtrace.sdk.name'] !== '@langtrase/typescript-sdk') {
      return { decision: SamplingDecision.NOT_RECORD }
    }

    // If parent span is not recorded, propagate the decision to child spans
    // None means no sampling decision has been made. If the parent span is not sampled, the child span should not be sampled.
    const parentSpan = trace.getSpan(context)
    if ((parentSpan != null) && parentSpan.spanContext().traceFlags === TraceFlags.NONE) {
      return { decision: SamplingDecision.NOT_RECORD }
    }

    return { decision: SamplingDecision.RECORD_AND_SAMPLED }
  }
}
