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
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = verifySchema.parse(body);
    const { userId, code, tempSession } = validatedData;

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

      // CRITICAL: Create response first, then create Supabase client that writes cookies to it
      // This ensures cookies are properly written to the response headers
      const { createServerClient } = await import('@supabase/ssr');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      // Create response object that we'll use to write cookies
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
          access_token: tempSession.access_token,
          refresh_token: tempSession.refresh_token,
          expires_at: tempSession.expires_at,
        },
        message: 'Code verified successfully',
      });

      // Create a Supabase client that writes cookies directly to our response
      // This ensures cookies are set in the response headers
      const responseSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Write cookies directly to the response object
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      // Set the session using the response-aware client
      // This will write cookies to the response object
      const { data: finalSessionData, error: finalSessionError } = await responseSupabase.auth.setSession({
        access_token: tempSession.access_token,
        refresh_token: tempSession.refresh_token,
      });

      if (finalSessionError || !finalSessionData.session) {
        console.error('[MFA Verify] ❌ Failed to set session with response client:', finalSessionError);
        return NextResponse.json(
          { 
            error: 'Session error',
            message: 'Failed to establish session. Please try logging in again.'
          },
          { status: 500 }
        );
      }

      // Verify the session user matches
      const { data: { user: finalUser }, error: finalUserError } = await responseSupabase.auth.getUser();
      
      if (finalUserError || !finalUser || finalUser.id !== userId) {
        console.error('[MFA Verify] ❌ Session validation failed with response client:', finalUserError);
        return NextResponse.json(
          { 
            error: 'Session error',
            message: 'Session validation failed. Please try logging in again.'
          },
          { status: 500 }
        );
      }

      console.log('[MFA Verify] ✅ Session set and verified with response client:', {
        userId: finalUser.id,
        email: finalUser.email,
      });

      // Verify cookies are in the response
      const responseCookies = response.cookies.getAll();
      console.log('[MFA Verify] Cookies in response:', {
        count: responseCookies.length,
        cookieNames: responseCookies.map(c => c.name),
        hasAccessToken: responseCookies.some(c => 
          c.name.includes('access-token') || 
          c.name.includes('auth-token') ||
          (c.name.includes('sb-') && (c.name.includes('auth-token') || c.name.includes('access-token')))
        ),
      });

      // If no cookies were set, this is a critical issue
      if (responseCookies.length === 0) {
        console.error('[MFA Verify] ❌ CRITICAL: No cookies found in response! Session will not persist.');
        console.error('[MFA Verify] This will cause redirect loops. Check Supabase SSR configuration.');
      } else {
        console.log('[MFA Verify] ✅ Cookies successfully written to response');
      }

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

