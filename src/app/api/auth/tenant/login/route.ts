/**
 * API Route: Tenant Login
 * 
 * POST /api/auth/tenant/login
 * 
 * Login for tenant users (admin/staff)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().optional(),
  deviceName: z.string().optional(),
  browserInfo: z.string().optional(),
  osInfo: z.string().optional(),
  trustDevice: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    const { email, password, deviceFingerprint, deviceName, browserInfo, osInfo, trustDevice } = validatedData;
    
    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     null;

    // Get tenant from middleware
    const tenant = await requireTenant();
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

    // Verify user belongs to this tenant
    const userTenantId = authData.user.user_metadata?.tenant_id;
    const role = authData.user.user_metadata?.role;
    const userId = authData.user.id;
    
    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt:', {
        userEmail: email,
        userId,
        userTenantId,
        currentTenantId: tenant.id,
        tenantSubdomain: tenant.subdomain,
        tenantUserId: tenant.user_id,
        userRole: role,
      });
    }
    
    // Check if user belongs to tenant via:
    // 1. user_metadata.tenant_id (primary check)
    // 2. tenant.user_id (fallback - database relationship)
    const belongsToTenant = 
      userTenantId === tenant.id || 
      tenant.user_id === userId;
    
    if (!belongsToTenant) {
      // Sign out if doesn't belong to tenant
      await supabase.auth.signOut();
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: `This account is not associated with ${tenant.name || tenant.subdomain}. Please contact support if you believe this is an error.`
        },
        { status: 403 }
      );
    }

    // Verify user is tenant admin or staff (not customer)
    if (role !== 'tenant_admin' && role !== 'tenant_staff') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: `This account does not have admin or staff privileges. Current role: ${role || 'none'}. Please contact support if you need access.`
        },
        { status: 403 }
      );
    }

    // Check if device is trusted (if device fingerprint is provided)
    let deviceTrusted = false;
    if (deviceFingerprint) {
      const { isDeviceTrusted } = await import('@/lib/auth/trusted-devices');
      const trustCheck = await isDeviceTrusted(
        authData.user.id,
        deviceFingerprint,
        ipAddress
      );
      deviceTrusted = trustCheck.trusted;
      
      // If IP changed significantly, require 2FA even if device was trusted
      if (trustCheck.requiresReauth) {
        deviceTrusted = false;
      }
    }

    // If device is trusted, skip 2FA and complete login
    if (deviceTrusted) {
      // Set session cookies
      const response = NextResponse.json({
        success: true,
        requiresMFA: false,
        message: 'Login successful',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      });

      // Set auth cookies (Supabase handles this automatically via middleware)
      return response;
    }

    // 2FA is MANDATORY for tenant admin accounts (unless device is trusted)
    // Always require 2FA verification, regardless of mfa_enabled flag
    // Import here to avoid circular dependencies
    const { generateAndSendOTP } = await import('@/lib/mfa/email-otp');
    
    try {
      // Generate and send OTP code
      await generateAndSendOTP(
        authData.user.id,
        authData.user.email!,
        tenant.name
      );

      // If user wants to trust this device, create trusted device after 2FA verification
      // We'll handle this in the MFA verify route
      // For now, just pass the trustDevice flag in the response
      
      // Don't sign out - keep the session for after OTP verification
      // Return response indicating 2FA is required
      // Include a temporary session token that can be used after OTP verification
      return NextResponse.json({
        success: true,
        requiresMFA: true,
        userId: authData.user.id,
        email: authData.user.email,
        trustDevice: trustDevice && !!deviceFingerprint, // Only trust if fingerprint provided
        deviceFingerprint,
        deviceName,
        browserInfo,
        osInfo,
        // Store session info temporarily (client should store this securely)
        tempSession: {
          access_token: authData.session?.access_token,
          expires_at: authData.session?.expires_at,
          refresh_token: authData.session?.refresh_token, // Include refresh token
        },
        message: `A 6-digit code has been sent to ${authData.user.email}. Please check your inbox and enter the code to complete login.`,
      });
    } catch (otpError: any) {
      console.error('Failed to send OTP:', otpError);
      console.error('OTP Error details:', {
        message: otpError.message,
        stack: otpError.stack,
        userId: authData.user.id,
        email: authData.user.email,
      });
      await supabase.auth.signOut();
      
      // Provide more specific error message in development
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorMessage = isDevelopment && otpError.message 
        ? `Unable to send verification code: ${otpError.message}`
        : 'Unable to send verification code. Please try again.';
      
      return NextResponse.json(
        { 
          error: 'Failed to send code',
          message: errorMessage,
          ...(isDevelopment && { details: otpError.message })
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
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Login failed',
        message: 'An unexpected error occurred. Please try again.',
        ...(isDevelopment && { 
          details: error.message,
          stack: error.stack 
        })
      },
      { status: 500 }
    );
  }
}

