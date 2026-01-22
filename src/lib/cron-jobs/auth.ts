/**
 * Cron Job Authentication Utility
 * 
 * Handles authentication for cron jobs from both Vercel (automatic) and manual triggers
 * 
 * IMPORTANT: Vercel automatically sends CRON_SECRET in Authorization header when CRON_SECRET env var is set
 * We also support CRON_SECRET_TOKEN for backward compatibility and manual triggers
 */

import { NextRequest } from 'next/server';

/**
 * Verify if a request is authorized to run a cron job
 * 
 * Vercel cron jobs automatically send CRON_SECRET in Authorization header (Bearer token)
 * Manual triggers require CRON_SECRET_TOKEN via Authorization header or query parameter
 * 
 * @param request - The incoming request
 * @returns Authorization result with debug info
 */
export function verifyCronJobAuth(request: NextRequest): {
  authorized: boolean;
  reason?: string;
  debug?: {
    hasVercelCronHeader: boolean;
    hasAuthHeader: boolean;
    hasQueryToken: boolean;
    hasExpectedToken: boolean;
    hasCronSecret: boolean;
    headerKeys?: string[];
  };
} {
  // Get all headers in lowercase for case-insensitive matching
  const allHeaders = Object.fromEntries(
    Array.from(request.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
  );

  // Check for Vercel cron header (case-insensitive)
  // Note: This header may not always be present, so we also check Authorization header
  const vercelCronHeader = 
    allHeaders['x-vercel-cron'] || 
    allHeaders['x-vercel-signature'] ||
    request.headers.get('x-vercel-cron') ||
    request.headers.get('X-Vercel-Cron');

  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  
  // Support both CRON_SECRET (Vercel standard) and CRON_SECRET_TOKEN (our custom)
  const expectedToken = process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN;
  const hasCronSecret = !!process.env.CRON_SECRET;

  const debug = {
    hasVercelCronHeader: !!vercelCronHeader,
    hasAuthHeader: !!authHeader,
    hasQueryToken: !!queryToken,
    hasExpectedToken: !!expectedToken,
    hasCronSecret,
    headerKeys: Object.keys(allHeaders).filter(k => 
      k.includes('vercel') || k.includes('cron') || k.includes('authorization')
    ),
  };

  // If Vercel cron header is present, allow (Vercel automatically authenticates)
  if (vercelCronHeader) {
    return { authorized: true, debug };
  }

  // If no token is configured, allow in development mode only
  if (!expectedToken) {
    if (process.env.NODE_ENV === 'development') {
      return { authorized: true, reason: 'Development mode - no token required', debug };
    }
    return { 
      authorized: false, 
      reason: 'CRON_SECRET or CRON_SECRET_TOKEN not configured', 
      debug 
    };
  }

  // Check for token in Authorization header or query parameter
  // Vercel automatically sends CRON_SECRET as Bearer token in Authorization header
  const headerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
  const providedToken = queryToken || headerToken;

  if (!providedToken) {
    return { 
      authorized: false, 
      reason: 'No token provided. Vercel cron jobs automatically send CRON_SECRET in Authorization header. Manual triggers require CRON_SECRET_TOKEN via Authorization header or query parameter.', 
      debug 
    };
  }

  if (providedToken !== expectedToken) {
    return { 
      authorized: false, 
      reason: 'Invalid token', 
      debug 
    };
  }

  return { authorized: true, debug };
}
