/**
 * API Route: Send Email OTP Code
 * 
 * POST /api/auth/tenant/mfa/send-code
 * 
 * Sends a 6-digit OTP code to the user's email for 2FA
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { generateAndSendOTP } from '@/lib/mfa/email-otp';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  userId: z.string().uuid('Invalid user ID'),
});

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = sendCodeSchema.parse(body);
    const { email, userId } = validatedData;
    const clientIp = getClientIp(request);

    const ipLimit = await checkRateLimit(`ratelimit:auth:mfa-send:ip:${clientIp}`, 10, 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const userLimit = await checkRateLimit(`ratelimit:auth:mfa-send:user:${userId}`, 3, 300);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: 'OTP resend limit reached. Please wait before requesting another code.' },
        { status: 429, headers: { 'Retry-After': String(userLimit.retryAfterSeconds) } }
      );
    }

    // Generate and send OTP
    await generateAndSendOTP(userId, email, tenant.name);

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

