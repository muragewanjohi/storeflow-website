/**
 * API Route: Get 2FA Status (Email-Based)
 * 
 * GET /api/auth/tenant/mfa/status
 * 
 * Returns whether email-based 2FA is enabled for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Get user to check metadata
    const { data: { user: fullUser }, error } = await supabase.auth.getUser();

    if (error || !fullUser) {
      return NextResponse.json(
        { 
          error: 'Failed to get 2FA status',
          message: 'Unable to retrieve user information'
        },
        { status: 500 }
      );
    }

    const isEnabled = fullUser.user_metadata?.mfa_enabled === true;

    return NextResponse.json({
      enabled: isEnabled,
    });
  } catch (error: any) {
    console.error('MFA status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get 2FA status',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

