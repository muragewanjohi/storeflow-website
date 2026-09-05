import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { getSharedAuthCookieDomain } from '@/lib/supabase/auth-cookie-domain';

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

function buildTenantDashboardAbsoluteUrl(subdomain: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const isLocalhost =
    baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  if (isLocalhost) {
    const url = new URL(baseUrl);
    return `${url.protocol}//${subdomain}.${url.hostname}${url.port ? `:${url.port}` : ''}/dashboard`;
  }
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  return `https://${subdomain}.${baseDomain}/dashboard`;
}

function isMarketingSiteHostname(hostname: string): boolean {
  const h = hostname.split(':')[0];
  const hasDefaultTenant = Boolean(process.env.DEFAULT_TENANT_SUBDOMAIN?.trim());
  if (h === 'localhost' || h === '127.0.0.1') {
    return !hasDefaultTenant;
  }
  if (h.includes('.localhost')) {
    return false;
  }
  return (
    h === 'www' ||
    h === 'marketing' ||
    h === 'www.dukanest.com' ||
    h === 'dukanest.com' ||
    h === 'www.storeflow.com' ||
    h === 'storeflow.com' ||
    h.includes('vercel.app') ||
    h === process.env.MARKETING_DOMAIN?.split(':')[0]
  );
}

function shouldRedirectTenantUserFromMarketingHomeToDashboard(
  requestUrl: URL,
  redirectTarget: string,
): boolean {
  let target: URL;
  try {
    target = new URL(redirectTarget);
  } catch {
    return false;
  }
  if (!isMarketingSiteHostname(requestUrl.hostname)) {
    return false;
  }
  if (!isMarketingSiteHostname(target.hostname)) {
    return false;
  }
  const path = target.pathname.replace(/\/+$/, '') || '/';
  return path === '/' || path === '/dashboard';
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
  let tenantSubdomainForCookie: string | null = null;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Ensure tenant context cookie is aligned with the authenticated tenant user.
    // This prevents localhost/root-domain OAuth flows from redirecting back to login.
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const tenantIdFromMetadata =
      typeof user?.user_metadata?.tenant_id === 'string'
        ? user.user_metadata.tenant_id
        : null;

    if (tenantIdFromMetadata) {
      const tenant = await prisma.tenants.findUnique({
        where: { id: tenantIdFromMetadata },
        select: { subdomain: true },
      });
      tenantSubdomainForCookie = tenant?.subdomain ?? null;
    } else if (user?.id) {
      const tenant = await prisma.tenants.findFirst({
        where: { user_id: user.id, deleted_at: null },
        select: { subdomain: true },
      });
      tenantSubdomainForCookie = tenant?.subdomain ?? null;
    }
  }

  let redirectTarget = resolveRedirectTarget(
    nextParam,
    nextCookie,
    requestUrl.origin,
  );

  if (
    tenantSubdomainForCookie &&
    shouldRedirectTenantUserFromMarketingHomeToDashboard(
      requestUrl,
      redirectTarget,
    )
  ) {
    redirectTarget = buildTenantDashboardAbsoluteUrl(tenantSubdomainForCookie);
  }

  const response = NextResponse.redirect(redirectTarget);
  const cookieDomain = getSharedAuthCookieDomain(request.headers.get('host'));
  if (tenantSubdomainForCookie) {
    response.cookies.set('tenant-subdomain', tenantSubdomainForCookie, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
  }
  response.cookies.set('dukanest_oauth_next', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}

