/**
 * API Route: Tenant User Management
 * 
 * GET /api/admin/users - List tenant users
 * POST /api/admin/users - Create tenant user (admin/staff)
 * 
 * Requires tenant admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['tenant_admin', 'tenant_staff']),
});

/**
 * GET /api/admin/users
 * 
 * List all users for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'landlord']);

    const tenant = await requireTenant();
    
    // Verify user belongs to tenant (unless landlord)
    if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get all users for this tenant
    // Note: In production, you'd want to store user-tenant relationships in a separate table
    // For now, we'll use user_metadata.tenant_id
    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return NextResponse.json(
        { 
          error: 'Failed to retrieve users',
          message: 'An error occurred while fetching user list'
        },
        { status: 500 }
      );
    }

    // Filter users by tenant_id
    const tenantUsers = users.filter(
      (u) => u.user_metadata?.tenant_id === tenant.id
    );

    // Map to response format
    const mappedUsers = tenantUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name,
      role: u.user_metadata?.role,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    return NextResponse.json({
      users: mappedUsers,
      count: mappedUsers.length,
    });
  } catch (error: any) {
    console.error('Error listing users:', error);
    
    // Handle authentication errors
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        },
        { status: 401 }
      );
    }
    
    // Handle authorization errors
    if (error.message?.includes('Access denied')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: error.message
        },
        { status: 403 }
      );
    }
    
    // Generic error handling
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Failed to list users',
        message: 'An unexpected error occurred',
        ...(isDevelopment && { details: error.message })
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * 
 * Create a new tenant user (admin or staff)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'landlord']);

    const tenant = await requireTenant();
    
    // Verify user belongs to tenant (unless landlord)
    if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);
    const { email, password, name, role } = validatedData;

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if email already exists by listing users and filtering
    try {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existingUser = users.find((u) => u.email === email);
      if (existingUser) {
        return NextResponse.json(
          { 
            error: 'Email already registered',
            message: 'A user with this email address already exists'
          },
          { status: 409 } // 409 Conflict is more appropriate for duplicate resources
        );
      }
    } catch (checkError: any) {
      // Log but continue - signup will also check for duplicates
      console.warn('Could not check existing user:', checkError);
    }

    // Create user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          tenant_id: tenant.id,
          name,
        },
      },
    });

    if (authError) {
      // Handle duplicate email error
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { 
            error: 'Email already registered',
            message: 'A user with this email address already exists'
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create user',
          message: authError.message || 'An error occurred during user creation'
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { 
          error: 'Failed to create user',
          message: 'User creation completed but no user data was returned'
        },
        { status: 500 }
      );
    }

    // Update user metadata
    try {
      await adminClient.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          role,
          tenant_id: tenant.id,
          name,
        },
      });
    } catch (updateError: any) {
      console.error('Failed to update user metadata:', updateError);
      // Continue even if metadata update fails (metadata was set during signup)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
        tenant_id: tenant.id,
        name,
      },
    }, { status: 201 });
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
    
    // Handle authentication errors
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        },
        { status: 401 }
      );
    }
    
    // Handle authorization errors
    if (error.message?.includes('Access denied')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: error.message
        },
        { status: 403 }
      );
    }

    console.error('Error creating user:', error);
    
    // Generic error handling
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Failed to create user',
        message: 'An unexpected error occurred',
        ...(isDevelopment && { details: error.message })
      },
      { status: 500 }
    );
  }
}

