/**
 * API Route: Tenant Admin Registration
 * 
 * POST /api/auth/tenant/register
 * 
 * Register a tenant admin user (typically during tenant creation)
 * Requires tenant context from middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant } from '@/lib/tenant-context/server';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['tenant_admin', 'tenant_staff']).default('tenant_admin'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    const { email, password, name, role } = validatedData;

    // Get tenant from middleware
    const tenant = await requireTenant();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if email already exists by listing users and filtering
    try {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existingUser = users.find((u) => u.email === email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
    } catch (checkError) {
      // If check fails, continue with signup (signup will also check)
      console.warn('Could not check existing user:', checkError);
    }

    // Create tenant user with role and tenant_id metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role || 'tenant_admin',
          tenant_id: tenant.id,
          name,
        },
      },
    });

    if (authError) {
      // Check if error is due to existing email
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
      
      console.error('Registration error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Update user metadata to include role and tenant_id using admin client
    try {
      await adminClient.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          role: role || 'tenant_admin',
          tenant_id: tenant.id,
          name,
        },
      });
    } catch (updateError) {
      console.error('Failed to update user metadata:', updateError);
      // Continue even if metadata update fails (metadata was set during signup)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: role || 'tenant_admin',
        tenant_id: tenant.id,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

