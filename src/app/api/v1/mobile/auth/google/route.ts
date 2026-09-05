import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileError } from '@/lib/api/mobile-response';
import { finalizeMobileDashboardSignIn } from '@/lib/auth/mobile-dashboard-sign-in';

const googleBodySchema = z.object({
  /** Google OIDC ID token from native `google_sign_in` / platform SDK */
  idToken: z.string().min(1, 'idToken is required'),
  /** Required by some ID tokens that include `at_hash` */
  accessToken: z.string().optional(),
});

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * POST /api/v1/mobile/auth/google
 * Exchange Google ID token for a Supabase session; same MFA + tenant rules as email/password login.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = googleBodySchema.parse(await request.json());
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: parsed.idToken,
      ...(parsed.accessToken ? { access_token: parsed.accessToken } : {}),
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', error?.message || 'Google sign-in failed'),
        { status: 401 },
      );
    }

    const outcome = await finalizeMobileDashboardSignIn(
      supabase,
      data.user,
      data.session,
      data.user.email ?? '',
      { skipEmailOtpForTenantRoles: true },
    );

    return NextResponse.json(outcome.payload, { status: outcome.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid Google sign-in payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile Auth Google]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to sign in with Google'), {
      status: 500,
    });
  }
}
