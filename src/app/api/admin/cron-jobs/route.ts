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
    const limit = parseInt(searchParams.get('limit') || '50');

    let logs;
    if (jobName) {
      logs = await getCronJobLogsByName(jobName, limit);
    } else {
      logs = await getCronJobLogs(limit);
    }

    const stats = await getCronJobStats();

    return NextResponse.json({
      logs,
      stats,
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
    };

    const handler = jobHandlers[jobPath];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown job path: ${jobPath}` },
        { status: 400 }
      );
    }

    // Create a mock request with cron secret token
    const cronToken = process.env.CRON_SECRET_TOKEN;
    const mockRequest = new NextRequest(request.url, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${cronToken}`,
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
