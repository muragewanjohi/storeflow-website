/**
 * API Route: Send Email OTP Code for Landlord
 * 
 * POST /api/auth/landlord/mfa/send-code
 * 
 * Sends a 6-digit OTP code to the landlord's email for 2FA
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendOTP } from '@/lib/mfa/email-otp';
import { z } from 'zod';

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  userId: z.string().uuid('Invalid user ID'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendCodeSchema.parse(body);
    const { email, userId } = validatedData;

    // Generate and send OTP
    await generateAndSendOTP(userId, email, 'Dukanest Admin');

    return NextResponse.json({
      success: true,
      message: `A 6-digit code has been sent to ${email}. Please check your inbox.`,
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

    console.error('Send OTP error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send code',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

