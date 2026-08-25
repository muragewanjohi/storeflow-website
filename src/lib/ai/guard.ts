/**
 * One-call guard for AI routes: rate limit, then quota. Every AI feature
 * route should call this before touching claude-client.ts, and nothing
 * else — this is what "no route reimplements this itself" (Phase 0 exit
 * criteria, docs/IMPLEMENTATION_TRACKER.md) means in practice.
 *
 * Order matters: rate limiting is an in-memory check (cheap, no DB), quota
 * checking hits the database (ai_usage_log aggregate) — reject the cheap
 * way first.
 */

import { NextResponse } from 'next/server';
import type { Tenant } from '@/lib/tenant-context';
import { canUseAiFeature } from '@/lib/subscriptions/limits';
import { checkAiRateLimit } from './rate-limit';
import type { AiFeature, AiUsageBucket } from './types';

export type AiGuardResult = { ok: true } | { ok: false; response: NextResponse };

export async function guardAiRequest(
  tenant: Tenant,
  feature: AiFeature,
  bucket: AiUsageBucket
): Promise<AiGuardResult> {
  const rate = await checkAiRateLimit(tenant.id, feature);
  if (!rate.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many requests. Please slow down and try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      ),
    };
  }

  const quota = await canUseAiFeature(tenant, feature, bucket);
  if (!quota.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: quota.reason ?? 'This AI feature is not available on your current plan.',
          current: quota.current,
          limit: quota.limit,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}
