/**
 * Process Scheduled Downgrades Cron Job
 * 
 * Processes scheduled plan downgrades that are due to take effect.
 * Runs daily to check for tenants with scheduled downgrades.
 * 
 * Schedule: Daily at 4 AM UTC (0 4 * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  startCronJobLog,
  completeCronJobLog,
} from '@/lib/cron-jobs/logger';
import { sendPlanDowngradeScheduledEmail } from '@/lib/subscriptions/emails';

/**
 * GET /api/admin/subscriptions/process-scheduled-downgrades
 * Process scheduled downgrades that are due
 */
export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Process Scheduled Downgrades',
    jobPath: '/api/admin/subscriptions/process-scheduled-downgrades',
  });

  try {
    // Security: Use shared auth utility
    // Vercel automatically sends CRON_SECRET in Authorization header when CRON_SECRET env var is set
    const { verifyCronJobAuth } = await import('@/lib/cron-jobs/auth');
    const authResult = verifyCronJobAuth(request);
    
    if (!authResult.authorized) {
      await completeCronJobLog(logId, 'failed', {
        error: `Unauthorized - ${authResult.reason || 'Invalid token'}`,
      });
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.reason || 'Invalid token'}` },
        { status: 401 }
      );
    }

    const now = new Date();
    console.log(`[${now.toISOString()}] Processing scheduled downgrades...`);

    // Find tenants with scheduled downgrades that are due
    const tenantsWithScheduledDowngrades = await prisma.tenants.findMany({
      where: {
        status: { not: 'deleted' },
        scheduled_plan_id: { not: null },
        scheduled_plan_change_date: {
          lte: now, // Due date has passed or is today
        },
      },
      include: {
        price_plans: true, // Current plan
        scheduled_plan: true, // Scheduled plan
      },
    });

    console.log(`Found ${tenantsWithScheduledDowngrades.length} scheduled downgrades to process`);

    let processed = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const tenant of tenantsWithScheduledDowngrades) {
      if (!tenant.scheduled_plan_id || !tenant.scheduled_plan_change_date) {
        continue;
      }

      try {
        const scheduledPlan = tenant.scheduled_plan;
        if (!scheduledPlan) {
          const error = `Scheduled plan not found for tenant ${tenant.id}`;
          console.error(error);
          errors++;
          errorDetails.push(error);
          continue;
        }

        const currentPlan = tenant.price_plans;

        // Calculate new expiration date (extend from current expire_date or now)
        const baseDate = tenant.expire_date && tenant.expire_date > now
          ? tenant.expire_date
          : now;
        const newExpireDate = new Date(baseDate);
        newExpireDate.setMonth(newExpireDate.getMonth() + scheduledPlan.duration_months);

        // Update tenant: apply downgrade
        await prisma.tenants.update({
          where: { id: tenant.id },
          data: {
            plan_id: tenant.scheduled_plan_id,
            expire_date: newExpireDate,
            start_date: now, // Update start date for new plan
            scheduled_plan_id: null,
            scheduled_plan_change_date: null,
            // Clear scheduled downgrade from data
            data: {
              ...((tenant.data as any) || {}),
              subscription: {
                ...((tenant.data as any)?.subscription || {}),
                scheduledDowngrade: undefined,
              },
            },
          },
        });

        // Update subscription change status to completed
        await prisma.subscription_changes.updateMany({
          where: {
            tenant_id: tenant.id,
            to_plan_id: tenant.scheduled_plan_id,
            status: 'scheduled',
            scheduled_change_date: {
              lte: now,
            },
          },
          data: {
            status: 'completed',
            effective_date: now,
          },
        });

        // Send notification email
        if (currentPlan) {
          sendPlanDowngradeScheduledEmail({
            tenant: tenant as any,
            currentPlan: {
              name: currentPlan.name,
              price: Number(currentPlan.price),
            },
            newPlan: {
              name: scheduledPlan.name,
              price: Number(scheduledPlan.price),
              duration_months: scheduledPlan.duration_months,
            },
            effectiveDate: now,
          }).catch((error) => {
            console.error(`Error sending downgrade email for tenant ${tenant.id}:`, error);
            // Don't fail the job if email fails
          });
        }

        console.log(
          `✓ Processed downgrade for tenant ${tenant.id}: ` +
          `${currentPlan?.name || 'No Plan'} → ${scheduledPlan.name}`
        );
        processed++;
      } catch (error) {
        const errorMsg = `Error processing downgrade for tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg, error);
        errors++;
        errorDetails.push(errorMsg);
      }
    }

    const result = {
      processed,
      errors,
      total: tenantsWithScheduledDowngrades.length,
      timestamp: now.toISOString(),
      errorDetails: errors > 0 ? errorDetails : undefined,
    };

    await completeCronJobLog(
      logId,
      errors > 0 ? 'failed' : 'success',
      { result }
    );

    console.log(
      `[${new Date().toISOString()}] Completed: ${processed} processed, ${errors} errors`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} downgrades, ${errors} errors`,
      ...result,
    });
  } catch (error) {
    console.error('Fatal error processing scheduled downgrades:', error);
    await completeCronJobLog(
      logId,
      'failed',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    
    return NextResponse.json(
      {
        error: 'Failed to process scheduled downgrades',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
