/**
 * API Route: Refresh Token
 * 
 * POST /api/auth/refresh
 * 
 * Refresh authentication token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get refresh token from request body or cookies
    const body = await request.json().catch(() => ({}));
    const refreshToken = body.refresh_token;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Refresh session
    const { data: authData, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !authData.session) {
      return NextResponse.json(
        { error: 'Failed to refresh session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (error: any) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

