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
import { parseStoredAddress, serializeStoredAddress } from '@/lib/customers/address-storage';

/**
 * GET /api/customers/profile/addresses - Get customer's addresses
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    
    // Get customer from session
    const { getCurrentCustomer } = await import('@/lib/customers/get-current-customer');
    const customer = await getCurrentCustomer();
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get addresses
    const addresses = await prisma.user_delivery_addresses.findMany({
      where: {
        user_id: customer.id,
        tenant_id: tenant.id,
      },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      addresses: addresses.map((address: any) => {
        const parsedAddress = parseStoredAddress(address.address);
        
        return {
          id: address.id,
          name: address.name,
          email: address.email,
          phone: address.phone,
          address: parsedAddress.address,
          city: address.city || '',
          state_id: address.state_id,
          state: parsedAddress.state || address.state_id || '', // Return state name if available
          country_id: address.country_id,
          country: parsedAddress.country || address.country_id || '', // Return country name if available
          postal_code: address.postal_code || '',
          address_label: parsedAddress.addressLabel,
          is_default: address.is_default,
          created_at: address.created_at,
          updated_at: address.updated_at,
        };
      }),
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
    
    // Get customer from session
    const { getCurrentCustomer } = await import('@/lib/customers/get-current-customer');
    const customer = await getCurrentCustomer();
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // If this is set as default, unset other default addresses
    if (validatedData.is_default) {
      await prisma.user_delivery_addresses.updateMany({
        where: {
          user_id: customer.id,
          tenant_id: tenant.id,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    // Try to look up state_id and country_id if state/country names are provided
    let stateId = validatedData.state_id;
    let countryId = validatedData.country_id;

    // If state is provided as string, try to find or create it
    if (!stateId && validatedData.state) {
      // Try to find existing state by name
      const existingState = await prisma.states.findFirst({
        where: {
          name: validatedData.state,
          tenant_id: tenant.id,
        },
      });
      stateId = existingState?.id || null;
    }

    // If country is provided as string, try to find or create it
    if (!countryId && validatedData.country) {
      // Try to find existing country by name
      const existingCountry = await prisma.countries.findFirst({
        where: {
          name: validatedData.country,
          tenant_id: tenant.id,
        },
      });
      countryId = existingCountry?.id || null;
    }

    const shouldStoreStateName = Boolean(validatedData.state && !stateId);
    const shouldStoreCountryName = Boolean(validatedData.country && !countryId);
    const addressField = serializeStoredAddress(validatedData.address, {
      state: shouldStoreStateName ? validatedData.state : null,
      country: shouldStoreCountryName ? validatedData.country : null,
      addressLabel: validatedData.address_label,
    });

    // Create address
    const address = await prisma.user_delivery_addresses.create({
      data: {
        tenant_id: tenant.id,
        user_id: customer.id,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        address: addressField,
        city: validatedData.city || null,
        state_id: stateId,
        country_id: countryId,
        postal_code: validatedData.postal_code,
        is_default: validatedData.is_default,
      },
    });

    return NextResponse.json(
      {
        success: true,
        address: (() => {
          const parsedAddress = parseStoredAddress(address.address);
          return {
            address: parsedAddress.address,
            state: parsedAddress.state || '',
            country: parsedAddress.country || '',
            address_label: parsedAddress.addressLabel,
            id: address.id,
            name: address.name,
            email: address.email,
            phone: address.phone,
            city: address.city || '',
            state_id: address.state_id,
            country_id: address.country_id,
            postal_code: address.postal_code || '',
            is_default: address.is_default,
            created_at: address.created_at,
          };
        })(),
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

