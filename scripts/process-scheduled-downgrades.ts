/**
 * Process Scheduled Downgrades Cron Job
 * 
 * This script should be run daily (via cron) to process scheduled plan downgrades
 * that are due to take effect.
 * 
 * Usage:
 *   npx tsx scripts/process-scheduled-downgrades.ts
 * 
 * Or add to cron:
 *   0 0 * * * cd /path/to/storeflow && npx tsx scripts/process-scheduled-downgrades.ts
 */

import { prisma } from '../src/lib/prisma/client';

async function processScheduledDowngrades() {
  const now = new Date();
  console.log(`[${now.toISOString()}] Processing scheduled downgrades...`);

  try {
    // Find tenants with scheduled downgrades that are due
    const tenantsWithScheduledDowngrades = await prisma.tenants.findMany({
      where: {
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

    for (const tenant of tenantsWithScheduledDowngrades) {
      if (!tenant.scheduled_plan_id || !tenant.scheduled_plan_change_date) {
        continue;
      }

      try {
        const scheduledPlan = tenant.scheduled_plan;
        if (!scheduledPlan) {
          console.error(`Scheduled plan not found for tenant ${tenant.id}`);
          errors++;
          continue;
        }

        const currentPlan = tenant.price_plans;
        const now = new Date();

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

        console.log(
          `✓ Processed downgrade for tenant ${tenant.id}: ` +
          `${currentPlan?.name || 'No Plan'} → ${scheduledPlan.name}`
        );
        processed++;
      } catch (error) {
        console.error(`✗ Error processing downgrade for tenant ${tenant.id}:`, error);
        errors++;
      }
    }

    console.log(
      `[${new Date().toISOString()}] Completed: ${processed} processed, ${errors} errors`
    );

    return {
      success: true,
      processed,
      errors,
      total: tenantsWithScheduledDowngrades.length,
    };
  } catch (error) {
    console.error('Fatal error processing scheduled downgrades:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  processScheduledDowngrades()
    .then((result) => {
      console.log('Result:', result);
      process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { processScheduledDowngrades };
