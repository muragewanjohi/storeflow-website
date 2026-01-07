/**
 * API Route: Start 2FA Enrollment
 * 
 * POST /api/auth/tenant/mfa/enroll
 * 
 * Initiates 2FA enrollment for tenant admin
 * Returns QR code and secret for authenticator app
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Only tenant admins can enroll in 2FA
    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        { error: 'Access denied', message: 'Only tenant admins and staff can enable 2FA' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Start MFA enrollment (TOTP)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `${user.email} - ${user.tenant_id ? 'Tenant Admin' : 'Admin'}`,
    });

    if (error) {
      console.error('MFA enrollment error:', error);
      
      // Check if MFA is not enabled in Supabase
      if (error.message?.includes('MFA') || error.message?.includes('not enabled')) {
        return NextResponse.json(
          { 
            error: '2FA not available',
            message: 'Two-factor authentication is not enabled in your Supabase project. Please enable MFA in your Supabase dashboard settings.'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to start 2FA enrollment',
          message: error.message || 'An error occurred while setting up 2FA'
        },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to start 2FA enrollment', message: 'No data returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qrCode: data.totp?.qr_code, // QR code data URL for scanning
      secret: data.totp?.secret, // Secret key for manual entry
      uri: data.totp?.uri, // Full URI for authenticator apps
      factorId: data.id, // Factor ID for verification
    });
  } catch (error: any) {
    console.error('MFA enrollment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start 2FA enrollment',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

