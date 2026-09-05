import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const mfaStatusSchema = z.object({
  userId: z.string().uuid('Invalid userId'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = mfaStatusSchema.parse(body);
    const adminClient = createAdminClient();

    const {
      data: { user },
      error,
    } = await adminClient.auth.admin.getUserById(userId);

    if (error || !user) {
      return NextResponse.json(
        mobileError('NOT_FOUND', 'User not found'),
        { status: 404 },
      );
    }

    const role = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : 'customer';
    const mfaEnabled = user.user_metadata?.mfa_enabled === true;
    const mfaRequired = role === 'tenant_admin' || role === 'tenant_staff';

    return NextResponse.json(
      mobileSuccess({
        userId: user.id,
        email: user.email,
        role,
        mfaEnabled,
        mfaRequired,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid MFA status payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile MFA Status] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch MFA status'),
      { status: 500 },
    );
  }
}

