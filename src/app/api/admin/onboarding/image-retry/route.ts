/**
 * Onboarding Image Retry Cron
 *
 * Finds tenants whose starter-pack image enrichment is stalled, failed, or
 * skipped (e.g. Nano Banana was down, the API key was missing, or the
 * serverless `after()` block was killed before it finished), and re-runs the
 * existing `starter-pack-image-repair` endpoint for each one so their store
 * stops rendering the placeholder SVG on every product.
 *
 * Scheduled in `vercel.json` and secured via `verifyCronJobAuth`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyCronJobAuth } from '@/lib/cron-jobs/auth';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';
import { isOnboardingPlaceholderUrl } from '@/lib/onboarding/image-placeholder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MIN_AGE_MINUTES = Number(process.env.ONBOARDING_IMAGE_RETRY_MIN_AGE_MINUTES || 5);
const MAX_AGE_HOURS = Number(process.env.ONBOARDING_IMAGE_RETRY_MAX_AGE_HOURS || 24);
const MAX_TENANTS_PER_RUN = Number(process.env.ONBOARDING_IMAGE_RETRY_BATCH_SIZE || 10);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Onboarding Image Retry',
    jobPath: '/api/admin/onboarding/image-retry',
  });

  try {
    const authResult = verifyCronJobAuth(request);
    if (!authResult.authorized) {
      await completeCronJobLog(logId, 'failed', {
        error: `Unauthorized - ${authResult.reason || 'Invalid token'}`,
      });
      return NextResponse.json(
        {
          message: 'Unauthorized',
          error: authResult.reason || 'Invalid token',
        },
        { status: 401 }
      );
    }

    const cutoffMin = new Date(Date.now() - MIN_AGE_MINUTES * 60 * 1000);
    const cutoffMax = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);

    // Candidate pool: recent tenants where we actually ran the onboarding flow.
    // We filter further in JS against the nested `data.onboarding_setup` JSON
    // shape because Prisma JSON filters for our Postgres provider don't cover
    // all the conditions (status in a set AND timestamp comparisons on nested
    // keys) cleanly.
    const candidates = await prisma.tenants.findMany({
      where: {
        status: { not: 'deleted' },
        created_at: { gte: cutoffMax, lte: cutoffMin },
      },
      select: {
        id: true,
        name: true,
        data: true,
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    type RetryTarget = {
      id: string;
      name: string;
      reason: string;
      status: string | null;
      stage: string | null;
    };

    const needsRetry: RetryTarget[] = [];

    for (const tenant of candidates) {
      if (needsRetry.length >= MAX_TENANTS_PER_RUN) break;

      const data = isRecord(tenant.data) ? tenant.data : {};
      const setup = isRecord(data.onboarding_setup) ? data.onboarding_setup : null;
      const status = typeof setup?.status === 'string' ? setup.status : null;
      const stage = typeof setup?.stage === 'string' ? setup.stage : null;

      // Primary signal: the background image job never reached a happy state.
      const setupNeedsRetry =
        setup !== null &&
        stage === 'images' &&
        status !== null &&
        ['pending', 'failed', 'skipped', 'running'].includes(status);

      // For `pending`/`running` we also require that it's been stuck long
      // enough to be suspicious (serverless `after()` should complete in < 2
      // minutes; anything older than MIN_AGE_MINUTES is almost certainly dead).
      if (setupNeedsRetry) {
        const queuedAt = toDate(setup?.queuedAt) || toDate(setup?.completedAt) || toDate(setup?.failedAt);
        if (status === 'pending' || status === 'running') {
          if (!queuedAt || queuedAt > cutoffMin) {
            continue;
          }
        }
        needsRetry.push({
          id: tenant.id,
          name: tenant.name,
          reason: `onboarding_setup.status=${status}`,
          status,
          stage,
        });
        continue;
      }

      // Secondary signal: tenant has products but every one still uses the
      // onboarding placeholder (images simply never got generated even though
      // onboarding_setup may be missing or says "completed").
      const productCount = await prisma.products.count({
        where: { tenant_id: tenant.id, status: 'active' },
      });
      if (productCount === 0) continue;

      const placeholderProductCount = await prisma.products.count({
        where: {
          tenant_id: tenant.id,
          status: 'active',
          // `isOnboardingPlaceholderUrl` handles env overrides; but for the DB
          // query we match the default path which is the common case.
          OR: [
            { image: '/images/onboarding-product-placeholder.svg' },
            { image: null },
            { image: '' },
          ],
        },
      });

      if (placeholderProductCount === productCount) {
        needsRetry.push({
          id: tenant.id,
          name: tenant.name,
          reason: 'all-products-still-placeholder',
          status,
          stage,
        });
      } else if (placeholderProductCount > 0) {
        // Partial placeholder state — also retry but mark it differently.
        // Double-check with the helper in case the env override is in use.
        const sampleProduct = await prisma.products.findFirst({
          where: { tenant_id: tenant.id, status: 'active' },
          select: { image: true },
        });
        if (sampleProduct && isOnboardingPlaceholderUrl(sampleProduct.image)) {
          needsRetry.push({
            id: tenant.id,
            name: tenant.name,
            reason: 'products-partially-placeholder',
            status,
            stage,
          });
        }
      }
    }

    const attempted: Array<{
      tenantId: string;
      tenantName: string;
      success: boolean;
      error?: string;
      reason: string;
      productsUpdated?: number;
      salesUpdated?: number;
    }> = [];

    // Forward the cron auth so the repair endpoint accepts us.
    const forwardAuthHeader =
      request.headers.get('authorization') ||
      (process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null) ||
      (process.env.CRON_SECRET_TOKEN ? `Bearer ${process.env.CRON_SECRET_TOKEN}` : null);

    for (const target of needsRetry) {
      try {
        const repairResponse = await fetch(
          `${request.nextUrl.origin}/api/admin/tenants/${target.id}/starter-pack-image-repair`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(forwardAuthHeader ? { Authorization: forwardAuthHeader } : {}),
              'x-vercel-cron': '1',
            },
            body: JSON.stringify({ dryRun: false }),
          }
        );
        const payload = await repairResponse.json().catch(() => ({}));

        if (!repairResponse.ok || !payload?.success) {
          attempted.push({
            tenantId: target.id,
            tenantName: target.name,
            success: false,
            reason: target.reason,
            error: payload?.error?.message || `HTTP ${repairResponse.status}`,
          });
          continue;
        }

        attempted.push({
          tenantId: target.id,
          tenantName: target.name,
          success: true,
          reason: target.reason,
          productsUpdated: Number(payload?.data?.productsUpdated ?? 0),
          salesUpdated: Number(payload?.data?.salesUpdated ?? 0),
        });
      } catch (error) {
        attempted.push({
          tenantId: target.id,
          tenantName: target.name,
          success: false,
          reason: target.reason,
          error: error instanceof Error ? error.message : 'Unknown retry error',
        });
      }
    }

    const summary = {
      checked: candidates.length,
      eligible: needsRetry.length,
      attempted: attempted.length,
      succeeded: attempted.filter((item) => item.success).length,
      failed: attempted.filter((item) => !item.success).length,
      results: attempted,
      batchLimit: MAX_TENANTS_PER_RUN,
      minAgeMinutes: MIN_AGE_MINUTES,
      maxAgeHours: MAX_AGE_HOURS,
    };

    await completeCronJobLog(logId, summary.failed > 0 ? 'failed' : 'success', {
      result: summary,
      error:
        summary.failed > 0
          ? `${summary.failed}/${summary.attempted} image retries failed`
          : undefined,
    });

    return NextResponse.json({
      message: 'Onboarding image retry completed',
      results: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Onboarding Image Retry] Unexpected error:', error);
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Internal server error'
            : 'Failed to run onboarding image retry',
      },
      { status: 500 }
    );
  }
}
