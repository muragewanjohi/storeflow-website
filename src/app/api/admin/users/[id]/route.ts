/**
 * API Route: Tenant User Management (Single User)
 * 
 * GET /api/admin/users/[id] - Get user details
 * PUT /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['tenant_admin', 'tenant_staff']).optional(),
});

/**
 * GET /api/admin/users/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'landlord']);

    const tenant = await requireTenant();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { id } = await params;

    // Get user
    const { data: targetUser, error } = await adminClient.auth.admin.getUserById(id);

    if (error || !targetUser.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user belongs to tenant
    if (targetUser.user.user_metadata?.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: targetUser.user.id,
        email: targetUser.user.email,
        name: targetUser.user.user_metadata?.name,
        role: targetUser.user.user_metadata?.role,
        created_at: targetUser.user.created_at,
        last_sign_in_at: targetUser.user.last_sign_in_at,
      },
    });
  } catch (error: any) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'landlord']);

    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { id } = await params;

    // Get current user data
    const { data: targetUser, error: getUserError } = await adminClient.auth.admin.getUserById(id);

    if (getUserError || !targetUser.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user belongs to tenant
    if (targetUser.user.user_metadata?.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update user metadata
    const updatedMetadata = {
      ...targetUser.user.user_metadata,
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.role && { role: validatedData.role }),
    };

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      id,
      {
        user_metadata: updatedMetadata,
      }
    );

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        name: updatedUser.user.user_metadata?.name,
        role: updatedUser.user.user_metadata?.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'landlord']);

    const tenant = await requireTenant();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { id } = await params;

    // Get user to verify
    const { data: targetUser, error: getUserError } = await adminClient.auth.admin.getUserById(id);

    if (getUserError || !targetUser.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user belongs to tenant
    if (targetUser.user.user_metadata?.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Prevent deleting yourself
    if (targetUser.user.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}

