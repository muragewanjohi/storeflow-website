/**
 * ai_usage_log write path.
 *
 * Every AI feature route should call recordAiUsage() once, right after a
 * successful claude-client.ts call, before returning its response. This is
 * what canUseAiFeature() (src/lib/subscriptions/limits.ts) reads back to
 * enforce quotas, and what backs the cost-monitoring guardrails in
 * docs/AI_FEATURES_PLAN.md.
 */

import { prisma } from '@/lib/prisma/client';
import type { AiUsage } from './claude-client';
import type { AiFeature, AiUsageBucket, AiProvider } from './types';

export interface RecordAiUsageParams {
  /**
   * Nullable for the Gemini starter-pack call site, which can genuinely run
   * before a tenant row exists (pre-registration onboarding) — see
   * migration 20260824180000_ai_usage_log_provider_and_nullable_tenant.sql.
   * Every Claude call site always has a real tenant; keep passing a real
   * id there, same as before this field became optional.
   */
  tenantId: string | null;
  feature: AiFeature;
  bucket: AiUsageBucket;
  usage: AiUsage;
  /** USD. Claude: Haiku 4.5 list pricing (see docs/AI_FEATURES_PLAN.md cost tables). Gemini: see @/lib/ai/gemini-cost.ts. Compute at the call site, never here. */
  estimatedCost: number;
  /** Items generated in this call, e.g. 10 for a batched description call, or the number of images in one starter-pack image batch. Defaults to 1. */
  itemCount?: number;
  /** Defaults to 'claude' — every pre-existing call site is Claude and doesn't need to pass this. */
  provider?: AiProvider;
}

export async function recordAiUsage(params: RecordAiUsageParams): Promise<void> {
  await prisma.ai_usage_log.create({
    data: {
      tenant_id: params.tenantId,
      feature: params.feature,
      bucket: params.bucket,
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
      estimated_cost: params.estimatedCost,
      item_count: params.itemCount ?? 1,
      provider: params.provider ?? 'claude',
    },
  });
}
