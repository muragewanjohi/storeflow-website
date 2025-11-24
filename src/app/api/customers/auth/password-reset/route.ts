/**
 * Customer Password Reset API Routes
 * 
 * POST: Request password reset
 * PUT: Reset password with token
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import {
  customerPasswordResetRequestSchema,
  customerPasswordResetSchema,
} from '@/lib/customers/validation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * POST /api/customers/auth/password-reset - Request password reset
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = customerPasswordResetRequestSchema.parse(body);

    // Find customer
    const customer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email: validatedData.email,
      },
    });

    // Don't reveal if email exists (security best practice)
    if (!customer) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Store reset token (we'll use email_verify_token field temporarily for reset tokens)
    // In production, you might want a separate password_reset_token field
    await prisma.customers.update({
      where: { id: customer.id },
      data: {
        email_verify_token: resetToken, // Reusing this field for reset token
      },
    });

    // Send password reset email (async, don't wait)
    (async () => {
      try {
        const { sendCustomerPasswordResetEmail } = await import('@/lib/customers/emails');
        await sendCustomerPasswordResetEmail({
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
          },
          tenant,
          resetToken,
        });
      } catch (error) {
        console.error('Error sending password reset email:', error);
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Error requesting password reset:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to request password reset' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/customers/auth/password-reset - Reset password with token
 */
export async function PUT(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = customerPasswordResetSchema.parse(body);

    // Find customer with reset token
    const customer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email_verify_token: validatedData.token, // Using this field for reset token
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Update password and clear reset token
    await prisma.customers.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        email_verify_token: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: error.status || 500 }
    );
  }
}

