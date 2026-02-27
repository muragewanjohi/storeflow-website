import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath) return '/';
  if (!nextPath.startsWith('/')) return '/';
  if (nextPath.startsWith('//')) return '/';
  return nextPath;
}

/**
 * OAuth callback handler.
 * Exchanges auth code for session server-side, then redirects to intended path.
 * Reads `next` from query param first, then falls back to `dukanest_oauth_next` cookie.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const nextCookie = request.cookies.get('dukanest_oauth_next')?.value ?? null;
  const nextPath = sanitizeNextPath(nextParam || nextCookie);

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectUrl = new URL(nextPath, requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('dukanest_oauth_next', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}

