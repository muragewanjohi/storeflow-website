/**
 * Customer Registration API Route
 * 
 * POST: Register a new customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { customerRegisterSchema } from '@/lib/customers/validation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = customerRegisterSchema.parse(body);

    // Check if customer with this email already exists
    const existingCustomer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email: validatedData.email,
      },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    // Create customer
    const customer = await prisma.customers.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        mobile: validatedData.mobile,
        company: validatedData.company,
        email_verified: false,
        email_verify_token: emailVerifyToken,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        mobile: true,
        company: true,
        email_verified: true,
        created_at: true,
      },
    });

            // Send welcome email (async, don't wait)
            (async () => {
              try {
                const { sendCustomerWelcomeEmail } = await import('@/lib/customers/emails');
                await sendCustomerWelcomeEmail({
                  customer: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                  },
                  tenant,
                  verificationToken: emailVerifyToken,
                });
              } catch (error) {
                console.error('Error sending welcome email:', error);
                // Don't fail customer creation if email fails
              }
            })();

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
                console.error('Failed to link guest orders:', err); // Log error but don't block registration
              }
            })();

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          username: customer.username,
          mobile: customer.mobile,
          company: customer.company,
          email_verified: customer.email_verified,
          created_at: customer.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering customer:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to register customer' },
      { status: error.status || 500 }
    );
  }
}

