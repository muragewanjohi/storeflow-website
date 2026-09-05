/**
 * API Route: Landlord Login
 * 
 * POST /api/auth/landlord/login
 * 
 * Login for landlord (admin) users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  getOtpEmailDeliveryFailureMessage,
  OTP_EMAIL_SERVICE_ERROR_CODE,
} from '@/lib/mfa/otp-delivery-user-message';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    const { email, password } = validatedData;

    const supabase = await createClient();

    // Sign in user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Don't reveal whether email exists or password is wrong (security best practice)
      return NextResponse.json(
        { 
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect'
        },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { 
          error: 'Login failed',
          message: 'Unable to complete login. Please try again.'
        },
        { status: 500 }
      );
    }

    // Verify user is a landlord
    const role = authData.user.user_metadata?.role;
    if (role !== 'landlord') {
      // Sign out if not landlord
      await supabase.auth.signOut();
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'This account does not have landlord privileges. Please use the tenant login.'
        },
        { status: 403 }
      );
    }

    // 2FA is MANDATORY for landlord accounts
    // Always require 2FA verification, regardless of mfa_enabled flag
    // Import here to avoid circular dependencies
    const { generateAndSendOTP } = await import('@/lib/mfa/email-otp');
    
    try {
      // Generate and send OTP code
      await generateAndSendOTP(
        authData.user.id,
        authData.user.email!,
        'Dukanest Admin'
      );

      // Don't sign out - keep the session for after OTP verification
      // Return response indicating 2FA is required
      // Include a temporary session token that can be used after OTP verification
      return NextResponse.json({
        success: true,
        requiresMFA: true,
        userId: authData.user.id,
        email: authData.user.email,
        // Store session info temporarily (client should store this securely)
        tempSession: {
          access_token: authData.session?.access_token,
          expires_at: authData.session?.expires_at,
        },
        message: `A 6-digit code has been sent to ${authData.user.email}. Please check your inbox and enter the code to complete login.`,
      });
    } catch (otpError: any) {
      console.error('Failed to send OTP:', otpError);
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: 'Failed to send code',
          message: getOtpEmailDeliveryFailureMessage(),
          code: OTP_EMAIL_SERVICE_ERROR_CODE,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // Handle validation errors
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

    console.error('Login error:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Login failed',
        message: 'An unexpected error occurred. Please try again.',
        ...(isDevelopment && { details: error.message })
      },
      { status: 500 }
    );
  }
}

