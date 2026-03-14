import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  redirectTo: z.string().url('Invalid redirect URL').optional(),
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
    const { email, redirectTo } = forgotPasswordSchema.parse(body);
    const supabase = getSupabaseClient();

    const defaultRedirectBase = process.env.NEXT_PUBLIC_APP_URL;
    const fallbackRedirect = defaultRedirectBase
      ? `${defaultRedirectBase}/reset-password`
      : undefined;

    // Always return a success response to avoid account enumeration.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? fallbackRedirect,
    });

    return NextResponse.json(
      mobileSuccess({
        sent: true,
        message: 'If an account exists for that email, a password reset link has been sent.',
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid forgot-password payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile Auth Forgot Password] Unexpected error:', error);

    // Preserve anti-enumeration behavior even on errors.
    return NextResponse.json(
      mobileSuccess({
        sent: true,
        message: 'If an account exists for that email, a password reset link has been sent.',
      }),
      { status: 200 },
    );
  }
}
