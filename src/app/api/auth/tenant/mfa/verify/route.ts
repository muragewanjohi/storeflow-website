/**
 * API Route: Verify Email OTP Code During Login
 * 
 * POST /api/auth/tenant/mfa/verify
 * 
 * Verifies email OTP code after initial password authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { verifyOTP } from '@/lib/mfa/email-otp';
import { z } from 'zod';

const verifySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
  trustDevice: z.boolean().optional().default(false),
  deviceFingerprint: z.string().optional(),
  deviceName: z.string().optional(),
  browserInfo: z.string().optional(),
  osInfo: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = verifySchema.parse(body);
    const { userId, code, trustDevice, deviceFingerprint, deviceName, browserInfo, osInfo } = validatedData;
    const tempSession = (body as any).tempSession;
    
    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     null;

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

    // Verify user belongs to this tenant
    const userTenantId = user.user_metadata?.tenant_id;
    const role = user.user_metadata?.role;
    
    const belongsToTenant = 
      userTenantId === tenant.id || 
      tenant.user_id === userId;
    
    if (!belongsToTenant) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: `This account is not associated with ${tenant.name || tenant.subdomain}.`
        },
        { status: 403 }
      );
    }

    // Verify user is tenant admin or staff
    if (role !== 'tenant_admin' && role !== 'tenant_staff') {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'This account does not have admin or staff privileges.'
        },
        { status: 403 }
      );
    }

    // After OTP verification, we need to create a session
    // The client should have stored the tempSession from the initial login
    // Use the tempSession if available, otherwise create a new session
    
    if (tempSession && tempSession.access_token && tempSession.refresh_token) {
      // Set the session server-side using the Supabase client
      // This will properly set the cookies that the server can read
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: tempSession.access_token,
        refresh_token: tempSession.refresh_token,
      });

      if (sessionError || !sessionData.session) {
        console.error('Failed to set session after OTP verification:', sessionError);
        return NextResponse.json(
          { error: 'Session error', message: 'Failed to establish session. Please try logging in again.' },
          { status: 500 }
        );
      }

      // Verify the session is valid by getting the user
      const { data: { user: sessionUser }, error: userCheckError } = await supabase.auth.getUser();
      
      if (userCheckError || !sessionUser || sessionUser.id !== userId) {
        console.error('Session validation failed after OTP verification:', userCheckError);
        return NextResponse.json(
          { error: 'Session error', message: 'Session validation failed. Please try logging in again.' },
          { status: 500 }
        );
      }

      // If user opted to trust this device, create trusted device record
      if (trustDevice && deviceFingerprint && deviceName && browserInfo && osInfo) {
        try {
          const { createTrustedDevice } = await import('@/lib/auth/trusted-devices');
          await createTrustedDevice({
            userId: user.id,
            deviceFingerprint,
            deviceName,
            browserInfo,
            osInfo,
            ipAddress,
          });
        } catch (deviceError) {
          // Log error but don't fail the login if device trust creation fails
          console.error('Failed to create trusted device:', deviceError);
        }
      }

      // Create response with session data
      // The cookies are automatically set by supabase.auth.setSession() through the cookie handlers
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: role as string,
          tenant_id: tenant.id,
          name: user.user_metadata?.name,
        },
        session: {
          access_token: sessionData.session.access_token,
          expires_at: sessionData.session.expires_at,
          refresh_token: sessionData.session.refresh_token,
        },
        message: 'Code verified successfully',
      });

      // Redirect to dashboard after successful session setup
      const redirectUrl = new URL('/dashboard', request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      
      // Copy cookies from the JSON response to the redirect response
      // The cookies are automatically set by supabase.auth.setSession() through the cookie handlers
      return redirectResponse;
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
        role: role as string,
        tenant_id: tenant.id,
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

