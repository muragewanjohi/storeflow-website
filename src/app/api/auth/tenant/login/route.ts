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

function setTenantSubdomainCookie(response: NextResponse, subdomain?: string | null): void {
  if (!subdomain) return;

  response.cookies.set('tenant-subdomain', subdomain.toLowerCase(), {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Log immediately with clear markers for Vercel logs
  console.log('========================================');
  console.log('[LOGIN API] POST /api/auth/tenant/login');
  console.log('[LOGIN API] Request received', {
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
  });
  console.log('========================================');

  try {
    console.log('[Login API] Step 1: Parsing request body');
    const body = await request.json();
    console.log('[Login API] Request body parsed', { hasEmail: !!body.email, hasPassword: !!body.password });
    
    // Validate input
    console.log('[Login API] Step 2: Validating input');
    const validatedData = loginSchema.parse(body);
    const { email, password, deviceFingerprint, deviceName, browserInfo, osInfo, trustDevice } = validatedData;
    console.log('[Login API] Input validated', { email, hasDeviceFingerprint: !!deviceFingerprint });
    
    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     null;

    // Get tenant from middleware
    console.log('[Login API] Step 3: Getting tenant from context');
    let tenant;
    try {
      tenant = await requireTenant();
      console.log('[Login API] Tenant resolved', {
        tenantId: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
      });
    } catch (tenantError: any) {
      console.error('[Login API] Failed to get tenant', {
        error: tenantError.message,
        stack: tenantError.stack,
      });
      throw tenantError;
    }

    console.log('[Login API] Step 4: Creating Supabase client');
    let supabase;
    try {
      supabase = await createClient();
      console.log('[Login API] Supabase client created');
    } catch (supabaseError: any) {
      console.error('[Login API] Failed to create Supabase client', {
        error: supabaseError.message,
        stack: supabaseError.stack,
      });
      throw supabaseError;
    }

    // Sign in user
    console.log('[Login API] Step 5: Attempting Supabase authentication');
    let authData, authError;
    try {
      const authResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authData = authResult.data;
      authError = authResult.error;
      console.log('[Login API] Supabase auth result', {
        hasUser: !!authData?.user,
        hasError: !!authError,
        errorMessage: authError?.message,
      });
    } catch (authException: any) {
      console.error('[Login API] Exception during Supabase auth', {
        error: authException.message,
        stack: authException.stack,
      });
      throw authException;
    }

    if (authError) {
      console.log('[Login API] Authentication failed', {
        errorCode: authError.status,
        errorMessage: authError.message,
      });
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
      console.error('[Login API] No user returned from authentication');
      return NextResponse.json(
        { 
          error: 'Login failed',
          message: 'Unable to complete login. Please try again.'
        },
        { status: 500 }
      );
    }

    console.log('[Login API] Step 6: User authenticated', {
      userId: authData.user.id,
      email: authData.user.email,
    });

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
    console.log('[Login API] Step 7: Checking device trust');
    let deviceTrusted = false;
    if (deviceFingerprint) {
      try {
        const { isDeviceTrusted } = await import('@/lib/auth/trusted-devices');
        const trustCheck = await isDeviceTrusted(
          authData.user.id,
          deviceFingerprint,
          ipAddress
        );
        deviceTrusted = trustCheck.trusted;
        console.log('[Login API] Device trust check', {
          trusted: deviceTrusted,
          requiresReauth: trustCheck.requiresReauth,
        });
        
        // If IP changed significantly, require 2FA even if device was trusted
        if (trustCheck.requiresReauth) {
          deviceTrusted = false;
        }
      } catch (trustError: any) {
        console.error('[Login API] Error checking device trust', {
          error: trustError.message,
          stack: trustError.stack,
        });
        // Continue without device trust if check fails
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

      setTenantSubdomainCookie(response, tenant.subdomain);
      // Set auth cookies (Supabase handles this automatically via middleware)
      return response;
    }

    // TEMPORARY: Check if 2FA bypass is enabled (development/testing only)
    // ⚠️ WARNING: Only use this while waiting for email service setup
    // Remove this flag once SendGrid is properly configured
    const disableMFA = process.env.DISABLE_MFA_TEMPORARILY;
    const nodeEnv = process.env.NODE_ENV;
    
    // Debug logging to help diagnose bypass issues
    console.log('========================================');
    console.log('[LOGIN API] BYPASS CHECK');
    console.log('[LOGIN API] DISABLE_MFA_TEMPORARILY:', disableMFA);
    console.log('[LOGIN API] NODE_ENV:', nodeEnv);
    console.log('[LOGIN API] disableMFA === "true":', disableMFA === 'true');
    console.log('[LOGIN API] nodeEnv is dev/test:', nodeEnv === 'development' || nodeEnv === 'test');
    console.log('[LOGIN API] BYPASS WILL BE:', disableMFA === 'true' && (nodeEnv === 'development' || nodeEnv === 'test'));
    console.log('========================================');
    
    const bypassMFA = disableMFA === 'true' && 
                      (nodeEnv === 'development' || nodeEnv === 'test');
    
    if (bypassMFA) {
      console.warn('[Login API] ⚠️ 2FA BYPASS ENABLED - This should only be used temporarily while email service is unavailable');
      console.warn('[Login API] Set DISABLE_MFA_TEMPORARILY=false and remove this flag once SendGrid is configured');
      
      // Complete login without 2FA
      const response = NextResponse.json({
        success: true,
        requiresMFA: false,
        message: 'Login successful (2FA temporarily disabled)',
        warning: '2FA is currently bypassed. Re-enable it once email service is configured.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      });
      
      setTenantSubdomainCookie(response, tenant.subdomain);
      console.log('[Login API] Login completed with 2FA bypass (temporary flag enabled)');
      return response;
    }

    // 2FA is MANDATORY for tenant admin accounts (unless device is trusted or bypassed)
    // Always require 2FA verification, regardless of mfa_enabled flag
    // Import here to avoid circular dependencies
    console.log('[Login API] Step 8: Generating and sending OTP');
    let generateAndSendOTP;
    try {
      const otpModule = await import('@/lib/mfa/email-otp');
      generateAndSendOTP = otpModule.generateAndSendOTP;
      console.log('[Login API] OTP module imported');
    } catch (importError: any) {
      console.error('[Login API] Failed to import OTP module', {
        error: importError.message,
        stack: importError.stack,
      });
      throw importError;
    }
    
    try {
      // Generate and send OTP code
      console.log('[Login API] Calling generateAndSendOTP', {
        userId: authData.user.id,
        email: authData.user.email,
        tenantName: tenant.name,
      });
      await generateAndSendOTP(
        authData.user.id,
        authData.user.email!,
        tenant.name
      );
      console.log('[Login API] OTP generated and sent successfully');

      // If user wants to trust this device, create trusted device after 2FA verification
      // We'll handle this in the MFA verify route
      // For now, just pass the trustDevice flag in the response
      
      // Don't sign out - keep the session for after OTP verification
      // Return response indicating 2FA is required
      // Include a temporary session token that can be used after OTP verification
      console.log('[Login API] Step 9: Returning success response with MFA requirement', {
        hasSession: !!authData.session,
        hasAccessToken: !!authData.session?.access_token,
        hasRefreshToken: !!authData.session?.refresh_token,
      });
      const response = NextResponse.json({
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
      setTenantSubdomainCookie(response, tenant.subdomain);
      console.log('[Login API] Login flow completed successfully', {
        duration: Date.now() - startTime,
        userId: authData.user.id,
      });
      return response;
    } catch (otpError: any) {
      console.error('Failed to send OTP:', otpError);
      console.error('OTP Error details:', {
        message: otpError.message,
        stack: otpError.stack,
        userId: authData.user.id,
        email: authData.user.email,
      });

      // Check if this is a SendGrid credit exhaustion error
      const isSendGridCreditError = otpError.message?.includes('Maximum credits exceeded') ||
                                   otpError.message?.includes('Unauthorized') && otpError.response?.body?.errors?.[0]?.message?.includes('Maximum credits exceeded');

      const isDevelopment = process.env.NODE_ENV === 'development';

      // In development, if SendGrid credits are exhausted, allow login without 2FA as a temporary workaround
      if (isDevelopment && isSendGridCreditError) {
        console.warn('[Login API] SendGrid credits exhausted in development mode. Allowing login without 2FA as temporary workaround.');

        // Set session cookies (Supabase handles this automatically via middleware)
        const response = NextResponse.json({
          success: true,
          requiresMFA: false,
          message: 'Login successful (2FA temporarily bypassed due to email service issue)',
          warning: 'SendGrid credits exceeded - 2FA was bypassed for this login. Please resolve email service configuration.',
          user: {
            id: authData.user.id,
            email: authData.user.email,
          },
        });

        setTenantSubdomainCookie(response, tenant.subdomain);
        console.log('[Login API] Login completed with 2FA bypass due to SendGrid credits');
        return response;
      }

      // For production or other errors, require proper 2FA
      await supabase.auth.signOut();

      // Provide more specific error message
      let errorMessage = 'Unable to send verification code. Please try again.';
      let errorCode = 'EMAIL_SERVICE_ERROR';

      if (isSendGridCreditError) {
        errorMessage = 'Email service temporarily unavailable due to sending limits exceeded. Please contact support or try again later.';
        errorCode = 'SENDGRID_CREDITS_EXCEEDED';
      } else if (isDevelopment && otpError.message) {
        errorMessage = `Unable to send verification code: ${otpError.message}`;
      }

      return NextResponse.json(
        {
          error: 'Failed to send code',
          message: errorMessage,
          code: errorCode,
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

    console.error('[Login API] ========== UNEXPECTED ERROR ==========');
    console.error('[Login API] Error type:', error?.constructor?.name);
    console.error('[Login API] Error message:', error?.message);
    console.error('[Login API] Error stack:', error?.stack);
    console.error('[Login API] Error name:', error?.name);
    console.error('[Login API] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('[Login API] Request duration:', Date.now() - startTime, 'ms');
    console.error('[Login API] =======================================');
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Login failed',
        message: 'An unexpected error occurred. Please try again.',
        ...(isDevelopment && { 
          details: error?.message,
          stack: error?.stack,
          errorType: error?.constructor?.name,
        })
      },
      { status: 500 }
    );
  }
}

