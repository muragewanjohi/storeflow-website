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
  tempSession: z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    expires_at: z.number().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  console.log('[MFA Verify] ========================================');
  console.log('[MFA Verify] POST /api/auth/tenant/mfa/verify');
  console.log('[MFA Verify] Request received at:', new Date().toISOString());
  
  try {
    const tenant = await requireTenant();
    console.log('[MFA Verify] Tenant:', tenant.subdomain);
    
    const body = await request.json();
    const validatedData = verifySchema.parse(body);
    const { userId, code, tempSession } = validatedData;
    
    console.log('[MFA Verify] userId:', userId);
    console.log('[MFA Verify] code length:', code?.length);
    console.log('[MFA Verify] tempSession provided:', !!tempSession);
    if (tempSession) {
      console.log('[MFA Verify] tempSession.access_token:', tempSession.access_token ? `${tempSession.access_token.substring(0, 20)}...` : 'MISSING');
      console.log('[MFA Verify] tempSession.refresh_token:', tempSession.refresh_token ? 'present' : 'MISSING');
      console.log('[MFA Verify] tempSession.expires_at:', tempSession.expires_at);
      
      // Check if token is expired
      if (tempSession.expires_at) {
        const expiresAt = new Date(tempSession.expires_at * 1000);
        const now = new Date();
        const isExpired = now > expiresAt;
        console.log('[MFA Verify] Token expires at:', expiresAt.toISOString());
        console.log('[MFA Verify] Current time:', now.toISOString());
        console.log('[MFA Verify] Token expired:', isExpired);
        if (isExpired) {
          console.error('[MFA Verify] ❌ TOKEN IS EXPIRED!');
          return NextResponse.json(
            { 
              error: 'Session expired',
              message: 'Your login session has expired. Please log in again.'
            },
            { status: 401 }
          );
        }
      }
    } else {
      console.warn('[MFA Verify] ⚠️ No tempSession provided!');
    }

    // Create Supabase client for initial operations
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

    // Use the tempSession if available, otherwise create a new session
    if (tempSession && tempSession.access_token && tempSession.refresh_token) {
      // Set the session server-side so cookies are available immediately
      // This ensures the dashboard layout can read the session
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: tempSession.access_token,
        refresh_token: tempSession.refresh_token,
      });

      if (sessionError || !sessionData.session) {
        console.error('[MFA Verify] Failed to set session server-side:', sessionError);
        return NextResponse.json(
          { 
            error: 'Session error',
            message: 'Failed to establish session. Please try logging in again.'
          },
          { status: 500 }
        );
      }

      // Verify the session is valid
      const { data: { user: sessionUser }, error: userCheckError } = await supabase.auth.getUser();
      
      if (userCheckError || !sessionUser || sessionUser.id !== userId) {
        console.error('[MFA Verify] Session validation failed:', userCheckError);
        return NextResponse.json(
          { 
            error: 'Session error',
            message: 'Session validation failed. Please try logging in again.'
          },
          { status: 500 }
        );
      }

      // Return a JSON response with cookies properly set.
      // Using JSON instead of redirect because opaque redirects (with redirect: 'manual')
      // don't reliably process Set-Cookie headers in all browsers.
      const { createServerClient } = await import('@supabase/ssr');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Create JSON response first
      const response = NextResponse.json({
        success: true,
        message: 'MFA verification successful',
        redirectTo: '/dashboard',
      });

      // Create Supabase client that sets cookies on the JSON response
      const responseSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            console.log('[MFA Verify] Setting cookies on response:', cookiesToSet.map(c => c.name));
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      const { data: finalSessionData, error: finalSessionError } = await responseSupabase.auth.setSession({
        access_token: tempSession.access_token,
        refresh_token: tempSession.refresh_token,
      });

      if (finalSessionError || !finalSessionData.session) {
        console.error('[MFA Verify] ❌ Failed to set session with response client:', finalSessionError);
        return NextResponse.json(
          { error: 'Session error', message: 'Failed to establish session. Please try logging in again.' },
          { status: 500 }
        );
      }

      const { data: { user: finalUser }, error: finalUserError } = await responseSupabase.auth.getUser();
      if (finalUserError || !finalUser || finalUser.id !== userId) {
        console.error('[MFA Verify] ❌ Session validation failed with response client:', finalUserError);
        return NextResponse.json(
          { error: 'Session error', message: 'Session validation failed. Please try logging in again.' },
          { status: 500 }
        );
      }

      // Log the cookies that will be sent
      const responseCookies = response.cookies.getAll();
      console.log('[MFA Verify] ✅ Session set; returning JSON with cookies:', responseCookies.map(c => c.name));
      
      return response;
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

