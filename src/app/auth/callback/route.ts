import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_DOMAINS = [
  'dukanest.com',
  'storeflow.com',
  'localhost',
  '127.0.0.1',
  'vercel.app',
];

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

function resolveRedirectTarget(
  nextParam: string | null,
  nextCookie: string | null,
  fallbackOrigin: string,
): string {
  const raw = nextParam || (nextCookie ? decodeURIComponent(nextCookie) : null);

  if (!raw) return `${fallbackOrigin}/`;

  // Full URL (cross-subdomain redirect from tenant login)
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return isAllowedRedirectUrl(raw) ? raw : `${fallbackOrigin}/`;
  }

  // Relative path
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return `${fallbackOrigin}${raw}`;
  }

  return `${fallbackOrigin}/`;
}

/**
 * OAuth callback handler.
 * Exchanges auth code for session server-side, then redirects to intended path.
 * Supports both relative paths (/register) and full URLs (http://shop.localhost:3000/dashboard)
 * for cross-subdomain tenant login flows.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const nextCookie = request.cookies.get('dukanest_oauth_next')?.value ?? null;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectTarget = resolveRedirectTarget(
    nextParam,
    nextCookie,
    requestUrl.origin,
  );

  const response = NextResponse.redirect(redirectTarget);
  response.cookies.set('dukanest_oauth_next', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}

