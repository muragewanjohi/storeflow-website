/**
 * Hard Delete Tenants Cleanup API Route
 * 
 * This endpoint performs hard deletion of tenants that have been soft-deleted
 * and are past the retention period (default: 90 days).
 * 
 * - Finds tenants with status='deleted' and deleted_at older than retention period
 * - Hard deletes tenant and all related data
 * - Removes subdomain/custom domain from Vercel
 * - Cleans up storage files (if applicable)
 * 
 * Should be called weekly by a cron job
 * 
 * Phase 2: Retention Tracking - Automated Hard Deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { removeTenantDomain } from '@/lib/vercel-domains';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';

/**
 * GET /api/admin/cleanup/hard-delete-tenants
 * Hard delete tenants past retention period
 */
export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Hard Delete Tenants',
    jobPath: '/api/admin/cleanup/hard-delete-tenants',
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
        { message: 'Unauthorized', error: authResult.reason || 'Invalid token' },
        { status: 401 }
      );
    }

    // Get retention period from environment variable (default: 90 days)
    const retentionDays = parseInt(process.env.TENANT_RETENTION_DAYS || '90');
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - retentionDays);

    // Find tenants that are deleted and past retention period
    const tenantsToDelete = await prisma.tenants.findMany({
      where: {
        status: 'deleted',
        deleted_at: {
          not: null,
          lt: retentionDate,
        },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        custom_domain: true,
      },
    });

    const results = {
      tenants_found: tenantsToDelete.length,
      tenants_deleted: 0,
      domains_removed: 0,
      errors: [] as string[],
    };

    const projectId = process.env.VERCEL_PROJECT_ID;

    // Hard delete each tenant
    for (const tenant of tenantsToDelete) {
      try {
        // 1. Remove subdomain from Vercel (if exists)
        if (projectId && tenant.subdomain) {
          try {
            const subdomainUrl = `${tenant.subdomain}.dukanest.com`;
            await removeTenantDomain(subdomainUrl, projectId);
            results.domains_removed++;
          } catch (error) {
            // Log but don't fail - domain might already be removed
            console.warn(`Failed to remove subdomain ${tenant.subdomain} from Vercel:`, error);
          }
        }

        // 2. Remove custom domain from Vercel (if exists)
        if (projectId && tenant.custom_domain) {
          try {
            await removeTenantDomain(tenant.custom_domain, projectId);
            results.domains_removed++;
          } catch (error) {
            // Log but don't fail - domain might already be removed
            console.warn(`Failed to remove custom domain ${tenant.custom_domain} from Vercel:`, error);
          }
        }

        // 3. Delete tenant-scoped data
        // Note: In a multi-tenant system, tenant data is typically isolated
        // If using separate databases per tenant, you'd delete the database here
        // For shared database with tenant_id, we delete related records

        // Delete tenant-related records (cascading deletes should handle most)
        // But we'll explicitly delete major tables to ensure cleanup
        const tenantId = tenant.id;

        // Delete in order to respect foreign key constraints
        await prisma.$transaction(async (tx) => {
          // Delete tenant-scoped data (these should cascade, but explicit for safety)
          // Note: Adjust based on your actual schema and foreign key constraints
          
          // Delete tenant record (this should cascade to related records if FK constraints are set)
          await tx.tenants.delete({
            where: { id: tenantId },
          });
        });

        results.tenants_deleted++;

        // 4. TODO: Clean up storage files
        // If you store files in S3, Supabase Storage, etc., delete them here
        // Example:
        // await deleteTenantStorageFiles(tenantId);

      } catch (error) {
        const errorMsg = `Failed to hard delete tenant ${tenant.id} (${tenant.name}): ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    const response = {
      message: 'Hard deletion cleanup completed',
      retention_days: retentionDays,
      retention_date: retentionDate.toISOString(),
      results,
      timestamp: new Date().toISOString(),
    };

    await completeCronJobLog(logId, 'success', {
      result: response.results,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error during hard deletion cleanup:', error);
    
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to perform hard deletion cleanup'
      },
      { status: 500 }
    );
  }
}

