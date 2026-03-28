import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import type { UserRole } from '@/lib/auth/types';
import { getTenantIdForSupabaseUser } from '@/lib/auth/mobile-auth';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = refreshSchema.parse(body);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: validatedBody.refreshToken,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Invalid or expired refresh token'),
        { status: 401 },
      );
    }

    const role = ((data.user.user_metadata?.role as UserRole | undefined) ?? 'customer');
    const tenantId = await getTenantIdForSupabaseUser(data.user);

    return NextResponse.json(
      mobileSuccess({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        tokenType: 'Bearer',
        user: {
          id: data.user.id,
          email: data.user.email,
          role,
          tenantId: tenantId ?? null,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid refresh payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile Auth Refresh] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to refresh token'),
      { status: 500 },
    );
  }
}

