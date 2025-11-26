/**
 * Customer Profile API Routes
 * 
 * GET: Get current customer profile
 * PUT: Update current customer profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { customerUpdateSchema } from '@/lib/customers/validation';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';

/**
 * GET /api/customers/profile - Get current customer profile
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        username: customer.username,
        mobile: customer.mobile,
        company: customer.company,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        postal_code: customer.postal_code,
        image: customer.image,
        email_verified: customer.email_verified,
      },
    });
    
    // Cache profile for 60 seconds - profile doesn't change frequently
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    
    return response;
  } catch (error: any) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/customers/profile - Update current customer profile
 */
export async function PUT(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = customerUpdateSchema.parse(body);

    // Update customer
    const updatedCustomer = await prisma.customers.update({
      where: { id: customer.id },
      data: {
        name: validatedData.name,
        username: validatedData.username || null,
        mobile: validatedData.mobile || null,
        company: validatedData.company || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        country: validatedData.country || null,
        postal_code: validatedData.postal_code || null,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        mobile: true,
        company: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postal_code: true,
        image: true,
        email_verified: true,
      },
    });

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
    });
  } catch (error: any) {
    console.error('Error updating customer profile:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: error.status || 500 }
    );
  }
}

