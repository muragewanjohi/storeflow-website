import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkSellingExists } from '@/lib/onboarding/selling-check';

export const dynamic = 'force-dynamic';

const sellingCheckSchema = z.object({
  selling: z.string().min(1, 'selling is required'),
  businessType: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = sellingCheckSchema.parse(body);

    const result = await checkSellingExists({
      selling: input.selling,
      businessType: input.businessType,
      limit: input.limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid selling check payload',
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
          message: error instanceof Error ? error.message : 'Failed to check selling existence',
        },
      },
      { status: 500 }
    );
  }
}
