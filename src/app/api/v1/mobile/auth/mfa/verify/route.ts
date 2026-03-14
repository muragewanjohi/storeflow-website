import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP } from '@/lib/mfa/email-otp';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const verifySchema = z.object({
  userId: z.string().uuid('Invalid userId'),
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must be numeric'),
  tempSession: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresAt: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, tempSession } = verifySchema.parse(body);

    const isValid = await verifyOTP(userId, code);

    if (!isValid) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Invalid or expired verification code'),
        { status: 401 },
      );
    }

    if (tempSession?.expiresAt) {
      const nowEpoch = Math.floor(Date.now() / 1000);
      if (nowEpoch > tempSession.expiresAt) {
        return NextResponse.json(
          mobileError('UNAUTHORIZED', 'Temporary session expired. Please login again.'),
          { status: 401 },
        );
      }
    }

    return NextResponse.json(
      mobileSuccess({
        verified: true,
        userId,
        accessToken: tempSession?.accessToken,
        refreshToken: tempSession?.refreshToken,
        expiresAt: tempSession?.expiresAt,
        tokenType: tempSession ? 'Bearer' : undefined,
        message: 'MFA verification successful',
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid MFA verify payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile MFA Verify] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to verify MFA code'),
      { status: 500 },
    );
  }
}

