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
import { prisma } from '@/lib/prisma/client';
import { getTenantStoreUrl } from '@/lib/subscriptions/tenant-url';
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
    const mappedUsers = tenantUsers.map((u: any) => ({
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

    // Check if tenant is on Basic Plan - block adding users
    let currentPlan = null;
    if (tenant.plan_id) {
      currentPlan = await prisma.price_plans.findUnique({
        where: { id: tenant.plan_id },
        select: {
          id: true,
          name: true,
        },
      });
    }

    const isBasicPlan = currentPlan?.name?.toLowerCase().includes('basic') ?? false;

    if (isBasicPlan) {
      return NextResponse.json(
        { 
          error: 'Plan restriction',
          message: 'Your current plan does not allow adding staff or admin users. Please upgrade your plan to continue.'
        },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check max staff users limit from pricing plan
    const { canAddStaffUser } = await import('@/lib/subscriptions/limits');
    
    // Check if user already exists to determine if we should exclude them from count
    let existingUserForLimitCheck = null;
    try {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      existingUserForLimitCheck = users.find((u) => 
        u.email?.toLowerCase() === email.toLowerCase()
      );
    } catch (listError) {
      // Continue with check even if listing fails
    }

    const staffLimitCheck = await canAddStaffUser(
      tenant,
      existingUserForLimitCheck?.id // Exclude existing user from count if updating
    );

    if (!staffLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Staff user limit reached',
          message: staffLimitCheck.reason || 'Cannot add more staff users. Please upgrade your plan.'
        },
        { status: 403 }
      );
    }

    // Build tenant-specific redirect URL for email confirmation
    const emailRedirectTo = getTenantStoreUrl(tenant, '/dashboard/login');

    // Check if user already exists and if they're associated with THIS tenant
    // Users can exist and be admins/staff in other stores, but shouldn't be added twice to the same store
    let existingUser = null;
    try {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
      
      if (!listError && users) {
        existingUser = users.find((u) => 
          u.email?.toLowerCase() === email.toLowerCase()
        );
        
        if (existingUser) {
          // Check if user is already associated with this tenant
          const userTenantId = existingUser.user_metadata?.tenant_id;
          const userRole = existingUser.user_metadata?.role;
          
          // Only reject if user is already associated with THIS tenant AND has admin/staff role
          if (userTenantId === tenant.id && 
              (userRole === 'tenant_admin' || userRole === 'tenant_staff')) {
            return NextResponse.json(
              { 
                error: 'User already exists',
                message: 'This user is already associated with this store. They may be an admin or staff member in another store, but cannot be added twice to the same store.'
              },
              { status: 409 }
            );
          }
          
          // If user exists but belongs to a different tenant, update their metadata to associate with this tenant
          // Note: This will move them to this tenant (they'll lose access to the previous tenant)
          try {
            const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
              existingUser.id,
              {
                user_metadata: {
                  ...existingUser.user_metadata,
                  role, // Update role for this tenant
                  tenant_id: tenant.id, // Update to current tenant
                  name, // Update name
                },
              }
            );

            if (updateError || !updatedUser) {
              return NextResponse.json(
                { 
                  error: 'Failed to update user',
                  message: updateError?.message || 'Could not associate existing user with this store'
                },
                { status: 400 }
              );
            }

            // User was updated successfully - send welcome email with store details
            // Note: No confirmation link needed for existing users - they can log in with their existing password
            (async () => {
              try {
                const { sendUserWelcomeEmail } = await import('@/lib/email/sendgrid');
                const loginUrl = getTenantStoreUrl(tenant, '/dashboard/login');
                await sendUserWelcomeEmail({
                  to: email,
                  userName: name,
                  tenantName: tenant.name,
                  subdomain: tenant.subdomain,
                  loginUrl,
                  role,
                  customDomain: tenant.custom_domain,
                  // No confirmation link for existing users
                });
              } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
              }
            })();

            return NextResponse.json({
              success: true,
              user: {
                id: updatedUser.user.id,
                email: updatedUser.user.email,
                role,
                tenant_id: tenant.id,
                name,
              },
            }, { status: 200 }); // 200 OK since user was updated, not created
          } catch (updateErr: any) {
            return NextResponse.json(
              { 
                error: 'Failed to update user',
                message: updateErr.message || 'An error occurred while updating user'
              },
              { status: 400 }
            );
          }
        }
      }
    } catch (checkError: any) {
      // Log but continue - will try to create user
      console.warn('Could not check existing user:', checkError);
    }

    // User doesn't exist - create new user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't auto-confirm, we'll send our own email with confirmation link
      user_metadata: {
        role,
        tenant_id: tenant.id,
        name,
      },
    });

    if (authError) {
      return NextResponse.json(
        { 
          error: 'Failed to create user',
          message: authError.message || 'An error occurred during user creation'
        },
        { status: 400 }
      );
    }

    if (!authUser?.user) {
      return NextResponse.json(
        { 
          error: 'Failed to create user',
          message: 'User creation completed but no user data was returned'
        },
        { status: 500 }
      );
    }

    // Generate confirmation link using Supabase admin API (only for new users)
    let confirmationLink: string | null = null;
    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'signup',
        email: email,
        password: password, // Required for signup type
        options: {
          redirectTo: emailRedirectTo,
        },
      });

      if (!linkError && linkData?.properties?.action_link) {
        confirmationLink = linkData.properties.action_link;
      } else {
        console.warn('Failed to generate confirmation link:', linkError);
      }
    } catch (linkGenError) {
      console.error('Error generating confirmation link:', linkGenError);
    }

    // Send welcome email with store details and confirmation link (non-blocking)
    (async () => {
      try {
        const { sendUserWelcomeEmail } = await import('@/lib/email/sendgrid');
        const loginUrl = getTenantStoreUrl(tenant, '/dashboard/login');
        await sendUserWelcomeEmail({
          to: email,
          userName: name,
          tenantName: tenant.name,
          subdomain: tenant.subdomain,
          loginUrl,
          role,
          customDomain: tenant.custom_domain,
          confirmationLink: confirmationLink || undefined,
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail user creation if email fails
      }
    })();

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
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

