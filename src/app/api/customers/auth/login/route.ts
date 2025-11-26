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

    // Also store customer email in a cookie for session lookup
    // TODO: In production, use a proper session table or JWT tokens
    cookieStore.set('customer_email', customer.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    // Merge guest cart into user cart (if guest cart exists)
    // This happens in the background - don't wait for it
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cart/merge`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    }).catch(err => {
      // Silently fail - cart merge is not critical for login
      console.error('Failed to merge cart:', err);
    });

    // Link guest orders to customer account (if guest orders exist)
    // This happens in the background - don't wait for it
    (async () => {
      try {
        const { linkGuestOrdersToCustomer } = await import('@/lib/orders/link-guest-orders');
        const linkedCount = await linkGuestOrdersToCustomer(
          customer.id,
          customer.email,
          tenant.id
        );
        if (linkedCount > 0) {
          console.log(`Linked ${linkedCount} guest order(s) to customer account`);
        }
      } catch (err) {
        console.error('Failed to link guest orders:', err); // Log error but don't block login
      }
    })();

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

