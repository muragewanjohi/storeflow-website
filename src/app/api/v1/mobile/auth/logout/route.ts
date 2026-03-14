import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
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
    const body = await request.json().catch(() => ({}));
    const parsed = logoutSchema.parse(body);
    const supabase = getSupabaseClient();

    // Best-effort revoke of current mobile session when refresh token is provided.
    if (parsed.refreshToken) {
      await supabase.auth.refreshSession({ refresh_token: parsed.refreshToken });
      await supabase.auth.signOut({ scope: 'global' });
    }

    return NextResponse.json(
      mobileSuccess({
        loggedOut: true,
        message: 'Logged out successfully',
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid logout payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile Auth Logout] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to logout'),
      { status: 500 },
    );
  }
}

