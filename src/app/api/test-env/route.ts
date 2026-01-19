/**
 * Test Environment Variables Endpoint
 * 
 * GET /api/test-env
 * 
 * Temporary endpoint to verify environment variables are being read correctly
 * Remove this file once debugging is complete
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const disableMFA = process.env.DISABLE_MFA_TEMPORARILY;
  const nodeEnv = process.env.NODE_ENV;
  
  const bypassWillWork = disableMFA === 'true' && 
                        (nodeEnv === 'development' || nodeEnv === 'test');
  
  return NextResponse.json({
    DISABLE_MFA_TEMPORARILY: disableMFA || 'NOT SET',
    NODE_ENV: nodeEnv || 'NOT SET',
    bypassWillWork,
    allEnvVars: {
      DISABLE_MFA_TEMPORARILY: process.env.DISABLE_MFA_TEMPORARILY,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN,
    },
    message: bypassWillWork 
      ? '✅ Bypass should work! Environment variables are set correctly.'
      : '❌ Bypass will NOT work. Check environment variables.',
  });
}
