/**
 * API Route: Verify and Complete 2FA Enrollment
 * 
 * POST /api/auth/tenant/mfa/verify-enroll
 * 
 * Verifies the TOTP code and completes 2FA enrollment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/server';
import { z } from 'zod';

const verifyEnrollSchema = z.object({
  factorId: z.string().uuid('Invalid factor ID'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

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

    const body = await request.json();
    const validatedData = verifyEnrollSchema.parse(body);
    const { factorId, code } = validatedData;

    const supabase = await createClient();

    // First, create a challenge for the factor
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challengeData) {
      console.error('MFA challenge error:', challengeError);
      return NextResponse.json(
        { 
          error: 'Verification failed',
          message: challengeError?.message || 'Unable to create verification challenge. Please try again.'
        },
        { status: 400 }
      );
    }

    // Verify the TOTP code and complete enrollment using the challenge
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      console.error('MFA verify error:', error);
      return NextResponse.json(
        { 
          error: 'Verification failed',
          message: error.message || 'Invalid code. Please try again.'
        },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Verification failed', message: 'No data returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been successfully enabled for your account',
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

    console.error('MFA verify enrollment error:', error);
    return NextResponse.json(
      { 
        error: 'Verification failed',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

