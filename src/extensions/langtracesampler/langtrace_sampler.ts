import { SpanKind, Attributes, Context } from '@opentelemetry/api'
import { Sampler, SamplingDecision, SamplingResult } from '@opentelemetry/sdk-trace-base'

export class LangtraceSampler implements Sampler {
  shouldSample (
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes
  ): SamplingResult {
    if (attributes['langtrace.sdk.name'] !== '@langtrase/typescript-sdk') {
      return { decision: SamplingDecision.NOT_RECORD }
    }
    return { decision: SamplingDecision.RECORD_AND_SAMPLED }
  }
}
