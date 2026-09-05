import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { verifyOTP } from '@/lib/mfa/email-otp';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { getTenantIdForSupabaseUser } from '@/lib/auth/mobile-auth';
import type { UserRole } from '@/lib/auth/types';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

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

    let userSummary: {
      id: string;
      email: string;
      role: UserRole;
      tenantId: string | null;
    } | null = null;

    if (tempSession?.accessToken) {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser(tempSession.accessToken);
        if (!userErr && user?.email) {
          const role = ((user.user_metadata?.role as UserRole | undefined) ?? 'customer');
          const tenantId = await getTenantIdForSupabaseUser(user);
          userSummary = {
            id: user.id,
            email: user.email,
            role,
            tenantId: tenantId ?? null,
          };
        }
      } catch {
        // Non-fatal: tokens are still returned for client use
      }
    }

    return NextResponse.json(
      mobileSuccess({
        verified: true,
        userId,
        user: userSummary,
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

