import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const JOB_NAME = 'onboarding_starter_pack_generation';

const saveAssetsSchema = z.object({
  assets: z.array(
    z.object({
      productName: z.string(),
      sourcePrompt: z.string(),
      imageUrl: z.string().url(),
      storagePath: z.string().optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      mimeType: z.string().optional(),
      provider: z.string().default('nano-banana'),
    })
  ),
  persistMode: z.enum(['job-only', 'tenant-profile']).default('job-only'),
  tenantId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = saveAssetsSchema.parse(body);

    const job = await prisma.cron_job_logs.findUnique({
      where: { id },
      select: {
        id: true,
        job_name: true,
        result: true,
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

    const currentResult =
      job.result && typeof job.result === 'object' && !Array.isArray(job.result)
        ? (job.result as Record<string, unknown>)
        : {};

    const currentData =
      currentResult.data && typeof currentResult.data === 'object' && !Array.isArray(currentResult.data)
        ? (currentResult.data as Record<string, unknown>)
        : {};

    const mergedResult = {
      ...currentResult,
      data: {
        ...currentData,
        savedAssets: input.assets,
        savedAssetsAt: new Date().toISOString(),
      },
    };

    await prisma.cron_job_logs.update({
      where: { id },
      data: {
        result: mergedResult as Prisma.InputJsonValue,
      },
    });

    if (input.persistMode === 'tenant-profile' && input.tenantId) {
      const tenant = await prisma.tenants.findUnique({
        where: { id: input.tenantId },
        select: { data: true },
      });

      const existingData =
        tenant?.data && typeof tenant.data === 'object' && !Array.isArray(tenant.data)
          ? (tenant.data as Record<string, unknown>)
          : {};

      await prisma.tenants.update({
        where: { id: input.tenantId },
        data: {
          data: {
            ...existingData,
            onboarding_generated_assets: input.assets,
            onboarding_generated_assets_updated_at: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: id,
        assetsSaved: input.assets.length,
        persistMode: input.persistMode,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid save-assets payload',
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
          message: error instanceof Error ? error.message : 'Failed to save generated assets',
        },
      },
      { status: 500 }
    );
  }
}
