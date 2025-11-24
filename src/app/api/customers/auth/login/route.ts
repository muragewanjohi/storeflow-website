/**
 * Customer Login API Route
 * 
 * POST: Login customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { customerLoginSchema } from '@/lib/customers/validation';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = customerLoginSchema.parse(body);

    // Find customer
    const customer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email: validatedData.email,
      },
    });

    if (!customer || !customer.password) {
      // Don't reveal whether email exists or password is wrong (security best practice)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, customer.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session token (simple implementation - in production, use JWT or session management)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store session in cookie
    const cookieStore = await cookies();
    cookieStore.set('customer_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        username: customer.username,
        email_verified: customer.email_verified,
      },
    });
  } catch (error: any) {
    console.error('Error logging in customer:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
      { status: error.status || 500 }
    );
  }
}

