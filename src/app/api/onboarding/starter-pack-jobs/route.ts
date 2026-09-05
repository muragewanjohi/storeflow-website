import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const createJobSchema = z.object({
  businessType: z.string().min(1, 'businessType is required'),
  selling: z.string().optional(),
  niche: z.string().optional(),
  storeName: z.string().optional(),
  themeId: z.string().uuid().optional(),
  themeSlug: z.string().optional(),
  locale: z.string().default('en-KE'),
  currency: z.string().default('KES'),
  productsCount: z.number().int().min(1).max(20).default(8),
  categoriesCount: z.number().int().min(1).max(12).default(8),
  blogPostsCount: z.number().int().min(1).max(6).default(2),
  checkSellingExists: z.boolean().default(true),
  forceExternalGeneration: z.boolean().default(false),
  geminiModel: z.string().default('gemini-2.5-flash'),
  includeGeminiCall: z.boolean().default(true),
  includeNanoBananaCall: z.boolean().default(true),
});

const JOB_NAME = 'onboarding_starter_pack_generation';
const JOB_PATH = '/api/onboarding/starter-pack-jobs';

async function runStarterPackJob(params: {
  jobId: string;
  origin: string;
  payload: Record<string, unknown>;
}) {
  const startedAt = Date.now();

  try {
    const response = await fetch(`${params.origin}/api/onboarding/starter-pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params.payload),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || 'Starter pack generation failed');
    }

    await prisma.cron_job_logs.update({
      where: { id: params.jobId },
      data: {
        status: 'success',
        completed_at: new Date(),
        duration_ms: Date.now() - startedAt,
        result: data as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    await prisma.cron_job_logs.update({
      where: { id: params.jobId },
      data: {
        status: 'failed',
        completed_at: new Date(),
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown starter-pack job error',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createJobSchema.parse(body);

    const metadata = {
      type: 'starter-pack-generation',
      source: 'flutter-or-web-onboarding',
      requestedAt: new Date().toISOString(),
      request: input,
    };

    const createdJob = await prisma.cron_job_logs.create({
      data: {
        job_name: JOB_NAME,
        job_path: JOB_PATH,
        status: 'running',
        metadata: metadata as Prisma.InputJsonValue,
        result: {} as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        status: true,
        started_at: true,
      },
    });

    const origin = request.nextUrl.origin;
    void runStarterPackJob({
      jobId: createdJob.id,
      origin,
      payload: input,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          jobId: createdJob.id,
          status: createdJob.status,
          startedAt: createdJob.started_at,
          statusUrl: `/api/onboarding/starter-pack-jobs/${createdJob.id}`,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid starter-pack job payload',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create starter-pack job',
        },
      },
      { status: 500 }
    );
  }
}
