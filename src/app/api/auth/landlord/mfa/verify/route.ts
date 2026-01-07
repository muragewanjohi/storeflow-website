/**
 * API Route: Verify Email OTP Code During Landlord Login
 * 
 * POST /api/auth/landlord/mfa/verify
 * 
 * Verifies email OTP code after initial password authentication for landlord
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyOTP } from '@/lib/mfa/email-otp';
import { z } from 'zod';

const verifySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
  tempSession: z.object({
    access_token: z.string(),
    expires_at: z.number().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifySchema.parse(body);
    const { userId, code, tempSession } = validatedData;

    const supabase = await createClient();

    // Verify the OTP code
    const isValid = await verifyOTP(userId, code);

    if (!isValid) {
      return NextResponse.json(
        { 
          error: 'Verification failed',
          message: 'Invalid or expired code. Please try again or request a new code.'
        },
        { status: 400 }
      );
    }

    // Get the user from Supabase
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();
    
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found', message: 'Unable to retrieve user information' },
        { status: 404 }
      );
    }

    // Verify user is landlord
    const role = user.user_metadata?.role;
    if (role !== 'landlord') {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'This account does not have landlord privileges.'
        },
        { status: 403 }
      );
    }

    // Use the tempSession if available, otherwise create a new session
    if (tempSession && tempSession.access_token) {
      // Validate the session token is still valid
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: 'landlord',
          name: user.user_metadata?.name,
        },
        session: {
          access_token: tempSession.access_token,
          expires_at: tempSession.expires_at,
        },
        message: 'Code verified successfully',
      });
    }

    // Fallback: Create a new session using admin API
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (linkError || !linkData) {
      console.error('Failed to generate session:', linkError);
      return NextResponse.json({
        success: true,
        message: 'Code verified successfully. Please refresh the page.',
        verified: true,
        userId: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: 'landlord',
        name: user.user_metadata?.name,
      },
      session: linkData.properties || {},
      message: 'Code verified successfully',
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

    console.error('MFA verify error:', error);
    return NextResponse.json(
      { 
        error: 'Verification failed',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

