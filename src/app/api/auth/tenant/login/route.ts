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
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    const { email, password } = validatedData;

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

    // Check if user has email-based 2FA enabled
    // We'll check user metadata for 2FA enabled flag
    const hasMFA = authData.user.user_metadata?.mfa_enabled === true;

    // If 2FA is enabled, send OTP code via email instead of completing login
    if (hasMFA) {
      // Import here to avoid circular dependencies
      const { generateAndSendOTP } = await import('@/lib/mfa/email-otp');
      
      try {
        // Generate and send OTP code
        await generateAndSendOTP(
          authData.user.id,
          authData.user.email!,
          tenant.name
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
            refresh_token: authData.session?.refresh_token, // Include refresh token
          },
          message: `A 6-digit code has been sent to ${authData.user.email}. Please check your inbox and enter the code to complete login.`,
        });
      } catch (otpError: any) {
        console.error('Failed to send OTP:', otpError);
        await supabase.auth.signOut();
        return NextResponse.json(
          { 
            error: 'Failed to send code',
            message: 'Unable to send verification code. Please try again.'
          },
          { status: 500 }
        );
      }
    }

    // No 2FA - complete login normally
    return NextResponse.json({
      success: true,
      requiresMFA: false,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: role as string,
        tenant_id: tenant.id,
        name: authData.user.user_metadata?.name,
      },
      session: {
        access_token: authData.session?.access_token,
        expires_at: authData.session?.expires_at,
      },
    });
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

