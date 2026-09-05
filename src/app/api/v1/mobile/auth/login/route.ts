import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { mobileError } from '@/lib/api/mobile-response';
import { finalizeMobileDashboardSignIn } from '@/lib/auth/mobile-dashboard-sign-in';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

const mobileLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
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
    const parsedBody = await request.json();
    const validatedBody = mobileLoginSchema.parse(parsedBody);
    const clientIp = getClientIp(request);

    const ipLimit = await checkRateLimit(`ratelimit:mobile:auth:login:ip:${clientIp}`, 20, 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        mobileError('RATE_LIMITED', 'Too many login attempts. Please try again later.'),
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const emailLimit = await checkRateLimit(
      `ratelimit:mobile:auth:login:email:${validatedBody.email.toLowerCase()}`,
      8,
      60
    );
    if (!emailLimit.allowed) {
      return NextResponse.json(
        mobileError('RATE_LIMITED', 'Too many login attempts for this account. Please try again later.'),
        { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfterSeconds) } }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedBody.email,
      password: validatedBody.password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Invalid credentials'),
        { status: 401 },
      );
    }

    const outcome = await finalizeMobileDashboardSignIn(
      supabase,
      data.user,
      data.session,
      validatedBody.email,
    );

    return NextResponse.json(outcome.payload, { status: outcome.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid login payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile Auth Login] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to login'),
      { status: 500 },
    );
  }
}
