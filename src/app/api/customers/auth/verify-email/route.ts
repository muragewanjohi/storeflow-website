/**
 * Customer Email Verification API Route
 * 
 * POST: Verify customer email with token
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { customerEmailVerificationSchema } from '@/lib/customers/validation';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = customerEmailVerificationSchema.parse(body);

    // Find customer with verification token
    const customer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email_verify_token: validatedData.token,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Verify email and clear token
    await prisma.customers.update({
      where: { id: customer.id },
      data: {
        email_verified: true,
        email_verify_token: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      customer: {
        id: customer.id,
        email: customer.email,
        email_verified: true,
      },
    });
  } catch (error: any) {
    console.error('Error verifying email:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to verify email' },
      { status: error.status || 500 }
    );
  }
}

