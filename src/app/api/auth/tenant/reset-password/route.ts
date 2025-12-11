/**
 * Reset Password API Route
 * 
 * POST /api/auth/tenant/reset-password
 * 
 * Validates that the user belongs to the current tenant before resetting password
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant-context/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Get current tenant from request
    const tenant = await getTenant();
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Create Supabase client to get current user from session
    const supabase = await createClient();
    
    // Get the current user from the session (established from reset token)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired reset token',
          message: 'The password reset link has expired or is invalid. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // Verify that this user belongs to the current tenant
    const tenantWithUser = await prisma.tenants.findFirst({
      where: {
        id: tenant.id,
        user_id: user.id,
      },
    });

    if (!tenantWithUser) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'This password reset link is not valid for this store. Please request a new password reset from the correct store.',
        },
        { status: 403 }
      );
    }

    // User belongs to tenant - proceed with password reset
    const { data, error } = await supabase.auth.updateUser({
      password: validatedData.password,
    });

    if (error) {
      console.error('Password reset error:', error);
      
      if (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('session')) {
        return NextResponse.json(
          { 
            error: 'Invalid or expired reset token',
            message: 'The password reset link has expired or is invalid. Please request a new one.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to reset password',
          message: error.message || 'An error occurred while resetting your password.',
        },
        { status: 400 }
      );
    }

    // Success - password reset
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Invalid input',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to reset password',
        message: error.message || 'An error occurred while resetting your password.',
      },
      { status: 500 }
    );
  }
}

