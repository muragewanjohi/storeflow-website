/**
 * Pre-Deletion Warnings API Route
 * 
 * This endpoint sends warning emails to tenants before hard deletion
 * - 30 days before deletion
 * - 7 days before deletion
 * - 1 day before deletion
 * 
 * Should be called daily by a cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { sendPreDeletionWarningEmail } from '@/lib/subscriptions/emails';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';

/**
 * GET /api/admin/cleanup/pre-deletion-warnings
 * Send pre-deletion warning emails to tenants approaching hard deletion
 */
export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Pre-Deletion Warnings',
    jobPath: '/api/admin/cleanup/pre-deletion-warnings',
  });

  try {
    // Security: Use shared auth utility
    const { verifyCronJobAuth } = await import('@/lib/cron-jobs/auth');
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

    // Get retention period from environment variable (default: 90 days)
    const retentionDays = parseInt(process.env.TENANT_RETENTION_DAYS || '90');
    const now = new Date();

    // Find tenants that are deleted and approaching hard deletion
    const deletedTenants = await prisma.tenants.findMany({
      where: {
        status: 'deleted',
        deleted_at: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        contact_email: true,
        deleted_at: true,
        data: true,
      },
    });

    const results = {
      tenants_checked: deletedTenants.length,
      warnings_30_days: 0,
      warnings_7_days: 0,
      warnings_1_day: 0,
      errors: [] as string[],
    };

    // Check each deleted tenant and send warnings if needed
    for (const tenant of deletedTenants) {
      if (!tenant.deleted_at) continue;

      try {
        const deletedAt = new Date(tenant.deleted_at);
        const daysSinceDeletion = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilDeletion = retentionDays - daysSinceDeletion;

        // Check if we need to send a warning
        // Send warnings at: 30 days, 7 days, and 1 day before deletion
        const shouldSend30DayWarning = daysUntilDeletion === 30;
        const shouldSend7DayWarning = daysUntilDeletion === 7;
        const shouldSend1DayWarning = daysUntilDeletion === 1;

        // Check if we've already sent this warning (store in tenant.data)
        const tenantData = (tenant.data as any) || {};
        const lastWarningSent = tenantData.last_deletion_warning_days || null;

        if (shouldSend30DayWarning && lastWarningSent !== 30) {
          await sendPreDeletionWarningEmail({
            tenant: tenant as any,
            daysUntilDeletion: 30,
          });

          // Update tenant data to track warning sent
          await prisma.tenants.update({
            where: { id: tenant.id },
            data: {
              data: {
                ...tenantData,
                last_deletion_warning_days: 30,
                last_deletion_warning_date: now.toISOString(),
              },
            },
          });

          results.warnings_30_days++;
        } else if (shouldSend7DayWarning && lastWarningSent !== 7) {
          await sendPreDeletionWarningEmail({
            tenant: tenant as any,
            daysUntilDeletion: 7,
          });

          // Update tenant data to track warning sent
          await prisma.tenants.update({
            where: { id: tenant.id },
            data: {
              data: {
                ...tenantData,
                last_deletion_warning_days: 7,
                last_deletion_warning_date: now.toISOString(),
              },
            },
          });

          results.warnings_7_days++;
        } else if (shouldSend1DayWarning && lastWarningSent !== 1) {
          await sendPreDeletionWarningEmail({
            tenant: tenant as any,
            daysUntilDeletion: 1,
          });

          // Update tenant data to track warning sent
          await prisma.tenants.update({
            where: { id: tenant.id },
            data: {
              data: {
                ...tenantData,
                last_deletion_warning_days: 1,
                last_deletion_warning_date: now.toISOString(),
              },
            },
          });

          results.warnings_1_day++;
        }
      } catch (error) {
        const errorMsg = `Failed to send warning to tenant ${tenant.id} (${tenant.name}): ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    const response = {
      message: 'Pre-deletion warnings processed',
      retention_days: retentionDays,
      results,
      timestamp: now.toISOString(),
    };

    await completeCronJobLog(logId, 'success', {
      result: response.results,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error processing pre-deletion warnings:', error);
    
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to process pre-deletion warnings'
      },
      { status: 500 }
    );
  }
}
