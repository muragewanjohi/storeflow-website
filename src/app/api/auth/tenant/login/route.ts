/**
 * API Route: Tenant Login
 * 
 * POST /api/auth/tenant/login
 * 
 * Login for tenant users (admin/staff)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant-context/server';
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
    if (userTenantId !== tenant.id) {
      // Sign out if doesn't belong to tenant
      await supabase.auth.signOut();
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'This account does not belong to this tenant.'
        },
        { status: 403 }
      );
    }

    // Verify user is tenant admin or staff (not customer)
    const role = authData.user.user_metadata?.role;
    if (role !== 'tenant_admin' && role !== 'tenant_staff') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'This account does not have admin or staff privileges.'
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
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
          details: error.errors.map(err => ({
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

