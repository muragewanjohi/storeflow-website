/**
 * Customer Addresses API Route (Customer-facing)
 * 
 * GET: Get customer's saved addresses
 * POST: Create customer address
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { customerAddressSchema } from '@/lib/customers/validation';

/**
 * GET /api/customers/profile/addresses - Get customer's addresses
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    
    // TODO: Get customer from session
    const customerId = new URL(request.url).searchParams.get('customer_id');
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customers.findFirst({
      where: {
        id: customerId,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get addresses
    const addresses = await prisma.user_delivery_addresses.findMany({
      where: {
        user_id: customerId,
        tenant_id: tenant.id,
      },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      addresses: addresses.map((address) => ({
        id: address.id,
        name: address.name,
        email: address.email,
        phone: address.phone,
        address: address.address,
        city: address.city,
        state_id: address.state_id,
        country_id: address.country_id,
        postal_code: address.postal_code,
        is_default: address.is_default,
        created_at: address.created_at,
        updated_at: address.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching customer addresses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch addresses' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/customers/profile/addresses - Create customer address
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = customerAddressSchema.parse(body);
    
    // TODO: Get customer from session
    const customerId = body.customer_id;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customers.findFirst({
      where: {
        id: customerId,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // If this is set as default, unset other default addresses
    if (validatedData.is_default) {
      await prisma.user_delivery_addresses.updateMany({
        where: {
          user_id: customerId,
          tenant_id: tenant.id,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    // Create address
    const address = await prisma.user_delivery_addresses.create({
      data: {
        tenant_id: tenant.id,
        user_id: customerId,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        state_id: validatedData.state_id,
        country_id: validatedData.country_id,
        postal_code: validatedData.postal_code,
        is_default: validatedData.is_default,
      },
    });

    return NextResponse.json(
      {
        success: true,
        address: {
          id: address.id,
          name: address.name,
          email: address.email,
          phone: address.phone,
          address: address.address,
          city: address.city,
          state_id: address.state_id,
          country_id: address.country_id,
          postal_code: address.postal_code,
          is_default: address.is_default,
          created_at: address.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating customer address:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create address' },
      { status: error.status || 500 }
    );
  }
}

