import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function isMobileOrPublicRegistrationApiPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/v1/mobile') ||
    pathname === '/api/tenants/register' ||
    pathname === '/api/tenants/check-subdomain'
  );
}

/**
 * CORS for Flutter Web and browser-based API clients.
 * Native Android/iOS requests typically send no Origin — headers are skipped.
 */
function reflectAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') {
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    return origin;
  }

  const fromEnv = process.env.MOBILE_CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv?.length) {
    return fromEnv.includes(origin) ? origin : null;
  }

  return null;
}

export function applyMobileApiCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = reflectAllowedOrigin(request);
  if (!origin) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With',
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export function mobileApiCorsPreflight(request: NextRequest): NextResponse {
  const origin = reflectAllowedOrigin(request);
  const headers = new Headers();
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With',
  );
  headers.set('Access-Control-Max-Age', '86400');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return new NextResponse(null, { status: 204, headers });
}
