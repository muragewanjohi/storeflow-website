/**
 * Welcome Email Series Cron Route
 *
 * Sends Day 3/7/14 onboarding emails to recently created tenants.
 * Day 1 is sent at registration time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';
import { verifyCronJobAuth } from '@/lib/cron-jobs/auth';
import { sendTenantOnboardingEmail } from '@/lib/onboarding/emails';
import { canSendOnboardingEmail } from '@/lib/onboarding/preferences';

type Stage = 'day3' | 'day7' | 'day14';

function getDaysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function pickStage(daysSinceStart: number, onboardingEmails: Record<string, any>): Stage | null {
  if (daysSinceStart >= 3 && !onboardingEmails.day3_sent_at) return 'day3';
  if (daysSinceStart >= 7 && !onboardingEmails.day7_sent_at) return 'day7';
  if (daysSinceStart >= 14 && !onboardingEmails.day14_sent_at) return 'day14';
  return null;
}

export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Welcome Email Series',
    jobPath: '/api/admin/onboarding/welcome-series',
  });

  try {
    const authResult = verifyCronJobAuth(request);
    if (!authResult.authorized) {
      await completeCronJobLog(logId, 'failed', {
        error: `Unauthorized - ${authResult.reason || 'Invalid token'}`,
      });
      return NextResponse.json(
        { message: 'Unauthorized', error: authResult.reason || 'Invalid token' },
        { status: 401 }
      );
    }

    const now = new Date();
    const lookbackDate = new Date(now);
    lookbackDate.setDate(lookbackDate.getDate() - 30);

    const tenants = await prisma.tenants.findMany({
      where: {
        deleted_at: null,
        status: 'active',
        start_date: {
          gte: lookbackDate,
          lte: now,
        },
        contact_email: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        custom_domain: true,
        start_date: true,
        contact_email: true,
        data: true,
      },
    });

    const results = {
      checked: tenants.length,
      sent_day3: 0,
      sent_day7: 0,
      sent_day14: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const tenant of tenants) {
      try {
        if (!tenant.start_date || !tenant.contact_email) {
          results.skipped++;
          continue;
        }

        const daysSinceStart = getDaysSince(tenant.start_date, now);
        if (daysSinceStart < 3) {
          results.skipped++;
          continue;
        }

        const tenantData = (tenant.data as any) || {};
        const onboardingEmails = (tenantData.onboarding_emails || {}) as Record<string, any>;
        if (!canSendOnboardingEmail(tenantData)) {
          results.skipped++;
          continue;
        }
        const stage = pickStage(daysSinceStart, onboardingEmails);

        if (!stage) {
          results.skipped++;
          continue;
        }

        await sendTenantOnboardingEmail({
          to: tenant.contact_email,
          tenantId: tenant.id,
          tenant: {
            name: tenant.name,
            subdomain: tenant.subdomain,
            custom_domain: tenant.custom_domain,
          },
          stage,
        });

        const updatedOnboarding = {
          ...onboardingEmails,
          onboarding_started_at: onboardingEmails.onboarding_started_at || tenant.start_date.toISOString(),
          [`${stage}_sent_at`]: now.toISOString(),
          ...(stage === 'day14' ? { series_completed_at: now.toISOString() } : {}),
        };

        await prisma.tenants.update({
          where: { id: tenant.id },
          data: {
            data: {
              ...tenantData,
              onboarding_emails: updatedOnboarding,
            },
          },
        });

        if (stage === 'day3') results.sent_day3++;
        if (stage === 'day7') results.sent_day7++;
        if (stage === 'day14') results.sent_day14++;
      } catch (error) {
        const message = `Tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(message);
        console.error('[Welcome Series] Error:', message);
      }
    }

    await completeCronJobLog(logId, 'success', { result: results });

    return NextResponse.json(
      {
        message: 'Welcome email series processed',
        results,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Welcome Series] Fatal error:', error);
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { message: 'Failed to process welcome email series' },
      { status: 500 }
    );
  }
}

