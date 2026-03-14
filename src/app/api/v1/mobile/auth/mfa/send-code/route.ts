import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { generateAndSendOTP } from '@/lib/mfa/email-otp';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const sendCodeSchema = z.object({
  userId: z.string().uuid('Invalid userId'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = sendCodeSchema.parse(body);
    const adminClient = createAdminClient();

    const {
      data: { user },
      error,
    } = await adminClient.auth.admin.getUserById(userId);

    if (error || !user || !user.email) {
      return NextResponse.json(
        mobileError('NOT_FOUND', 'User not found'),
        { status: 404 },
      );
    }

    const tenantId =
      typeof user.user_metadata?.tenant_id === 'string' ? user.user_metadata.tenant_id : undefined;

    const tenant = tenantId
      ? await prisma.tenants.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, subdomain: true },
        })
      : null;

    const tenantName = tenant?.name || tenant?.subdomain || 'DukaNest';

    await generateAndSendOTP(user.id, user.email, tenantName);

    return NextResponse.json(
      mobileSuccess({
        sent: true,
        userId: user.id,
        email: user.email,
        message: `A 6-digit code has been sent to ${user.email}`,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid send-code payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile MFA Send Code] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to send MFA code'),
      { status: 500 },
    );
  }
}

