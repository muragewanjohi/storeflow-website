import { NextRequest, NextResponse } from 'next/server';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';
import { processPendingTumiziProvisioning } from '@/lib/tumizi/provisioning';

export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Tumizi Provision Pending Merchants',
    jobPath: '/api/admin/integrations/tumizi/provision-pending',
  });

  try {
    const { verifyCronJobAuth } = await import('@/lib/cron-jobs/auth');
    const authResult = verifyCronJobAuth(request);

    if (!authResult.authorized) {
      await completeCronJobLog(logId, 'failed', {
        error: `Unauthorized - ${authResult.reason || 'Invalid token'}`,
      });
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.reason || 'Invalid token'}` },
        { status: 401 },
      );
    }

    const limit = Number(new URL(request.url).searchParams.get('limit') || 20);
    const result = await processPendingTumiziProvisioning(Math.max(1, Math.min(limit, 100)));

    const status = result.failed > 0 ? 'failed' : 'success';
    await completeCronJobLog(logId, status, {
      result: {
        ...result,
        timestamp: new Date().toISOString(),
      },
      ...(result.failed > 0
        ? {
            error: `${result.failed} tenant(s) failed Tumizi provisioning`,
          }
        : {}),
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} pending Tumizi provisioning task(s)`,
      ...result,
    });
  } catch (error) {
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to process pending Tumizi provisioning',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
