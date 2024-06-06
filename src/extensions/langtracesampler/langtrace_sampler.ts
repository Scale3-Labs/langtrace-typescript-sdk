import { TracedMethods } from '@langtrace-init/types'
import { SpanKind, Attributes, Context, trace, TraceFlags, diag } from '@opentelemetry/api'
import { Sampler, SamplingDecision, SamplingResult } from '@opentelemetry/sdk-trace-base'

export class LangtraceSampler implements Sampler {
  private readonly _disabledMethodNames: Set<string>

  constructor (disabled_methods: Partial<TracedMethods> | undefined) {
    this._disabledMethodNames = new Set<string>()
    for (const key in disabled_methods) {
      if (disabled_methods[key as keyof typeof disabled_methods] !== undefined) {
        const methods = (disabled_methods[key as keyof typeof disabled_methods] as string[])
        methods.forEach((method) => {
          this._disabledMethodNames.add(method)
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
    if (this._disabledMethodNames.has(spanName)) {
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
