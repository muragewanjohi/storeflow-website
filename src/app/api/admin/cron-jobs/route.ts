/**
 * Cron Jobs Monitoring API
 * 
 * GET: Get cron job execution logs and statistics
 * POST: Trigger/restart a cron job manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { getCronJobLogs, getCronJobStats, getCronJobLogsByName } from '@/lib/cron-jobs/logger';
import { GET as paymentRemindersGET } from '../subscriptions/payment-reminders/route';
import { GET as expiryCheckerGET } from '../subscriptions/expiry-checker/route';
import { GET as processScheduledDowngradesGET } from '../subscriptions/process-scheduled-downgrades/route';
import { GET as analyticsAggregateGET } from '../analytics/aggregate/route';
import { GET as cleanupGET } from '../cleanup/route';
import { GET as hardDeleteTenantsGET } from '../cleanup/hard-delete-tenants/route';
import { GET as salesAutomateGET } from '../sales/automate/route';
import { GET as tumiziProvisionPendingGET } from '../integrations/tumizi/provision-pending/route';
import { GET as tumiziSyncPendingPaymentsGET } from '../integrations/tumizi/sync-pending-payments/route';

/**
 * GET /api/admin/cron-jobs
 * Get cron job logs and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Require landlord authentication
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const { searchParams } = new URL(request.url);
    const jobName = searchParams.get('jobName');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let logs;
    let pagination = null;
    
    if (jobName) {
      logs = await getCronJobLogsByName(jobName, limit);
    } else {
      const result = await getCronJobLogs(limit, offset);
      logs = result.logs;
      pagination = result.pagination;
    }

    const stats = await getCronJobStats();

    return NextResponse.json({
      logs,
      stats,
      pagination,
    });
  } catch (error) {
    console.error('Error fetching cron job logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch cron job logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cron-jobs
 * Trigger/restart a cron job manually
 */
export async function POST(request: NextRequest) {
  try {
    // Require landlord authentication
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const body = await request.json();
    const { jobPath } = body;

    if (!jobPath) {
      return NextResponse.json(
        { error: 'jobPath is required' },
        { status: 400 }
      );
    }

    // Map job paths to handlers
    const jobHandlers: Record<string, (req: NextRequest) => Promise<Response>> = {
      '/api/admin/subscriptions/payment-reminders': paymentRemindersGET,
      '/api/admin/subscriptions/expiry-checker': expiryCheckerGET,
      '/api/admin/subscriptions/process-scheduled-downgrades': processScheduledDowngradesGET,
      '/api/admin/analytics/aggregate': analyticsAggregateGET,
      '/api/admin/cleanup': cleanupGET,
      '/api/admin/cleanup/hard-delete-tenants': hardDeleteTenantsGET,
      '/api/admin/cleanup/pre-deletion-warnings': async (req) => {
        const { GET } = await import('../cleanup/pre-deletion-warnings/route');
        return GET(req);
      },
      '/api/admin/sales/automate': salesAutomateGET,
      '/api/admin/integrations/tumizi/provision-pending': tumiziProvisionPendingGET,
      '/api/admin/integrations/tumizi/sync-pending-payments': tumiziSyncPendingPaymentsGET,
    };

    const handler = jobHandlers[jobPath];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown job path: ${jobPath}` },
        { status: 400 }
      );
    }

    // Create a mock request with cron secret token
    // Use the actual job path URL, not the current request URL
    // Support both CRON_SECRET (Vercel standard) and CRON_SECRET_TOKEN (manual triggers)
    const cronToken = process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN;
    const jobUrl = new URL(jobPath, request.url);
    const mockRequest = new NextRequest(jobUrl.toString(), {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${cronToken}`,
        // Also add x-vercel-cron header to simulate Vercel cron call
        'x-vercel-cron': '1',
      },
    });

    const result = await handler(mockRequest);
    const data = await result.json();

    return NextResponse.json({
      message: `Job "${jobPath}" executed successfully`,
      result: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error triggering cron job:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger cron job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
