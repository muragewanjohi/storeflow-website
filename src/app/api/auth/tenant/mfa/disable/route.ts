/**
 * API Route: Disable 2FA
 * 
 * POST /api/auth/tenant/mfa/disable
 * 
 * Disables 2FA for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/server';
import { z } from 'zod';

const disableSchema = z.object({
  password: z.string().min(1, 'Password is required'), // Require password confirmation
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Only tenant admins can disable 2FA
    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        { error: 'Access denied', message: 'Only tenant admins and staff can disable 2FA' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = disableSchema.parse(body);
    const { password } = validatedData;

    const supabase = await createClient();

    // Verify password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { 
          error: 'Invalid password',
          message: 'Password is incorrect. Please try again.'
        },
        { status: 401 }
      );
    }

    // Get the full user object to access user_metadata
    const { data: { user: fullUser } } = await supabase.auth.getUser();
    
    if (!fullUser) {
      return NextResponse.json(
        { 
          error: 'User not found',
          message: 'Unable to retrieve user information'
        },
        { status: 404 }
      );
    }

    // For email-based 2FA, we just update user metadata
    // Since we're using email OTP (not Supabase MFA), we don't need to unenroll factors
    // Just update the user metadata to disable 2FA flag
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...(fullUser.user_metadata || {}),
        mfa_enabled: false,
      },
    });

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return NextResponse.json(
        { 
          error: 'Failed to disable 2FA',
          message: updateError.message || 'An error occurred while disabling 2FA'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been successfully disabled for your account',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: 'Please check your input and try again',
          details: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('MFA disable error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to disable 2FA',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

