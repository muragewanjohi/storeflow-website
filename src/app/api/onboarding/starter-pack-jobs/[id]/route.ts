import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

const JOB_NAME = 'onboarding_starter_pack_generation';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.cron_job_logs.findUnique({
      where: { id },
      select: {
        id: true,
        job_name: true,
        status: true,
        started_at: true,
        completed_at: true,
        duration_ms: true,
        result: true,
        error: true,
        metadata: true,
      },
    });

    if (!job || job.job_name !== JOB_NAME) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Starter-pack job not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        durationMs: job.duration_ms,
        error: job.error,
        metadata: job.metadata,
        result: job.result,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch starter-pack job status',
        },
      },
      { status: 500 }
    );
  }
}
