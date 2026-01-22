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
        // Extract state and country from address field if stored there
        let addressValue = address.address || '';
        let stateName = null;
        let countryName = null;
        
        if (addressValue.includes('|state:') || addressValue.includes('|country:')) {
          const parts = addressValue.split('|');
          addressValue = parts[0]; // The actual address
          parts.slice(1).forEach((part: string) => {
            if (part.startsWith('state:')) {
              stateName = part.replace('state:', '');
            } else if (part.startsWith('country:')) {
              countryName = part.replace('country:', '');
            }
          });
        }
        
        return {
          id: address.id,
          name: address.name,
          email: address.email,
          phone: address.phone,
          address: addressValue,
          city: address.city,
          state_id: address.state_id,
          state: stateName || address.state_id || '', // Return state name if available
          country_id: address.country_id,
          country: countryName || address.country_id || '', // Return country name if available
          postal_code: address.postal_code,
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

    // Store state and country names in address field if IDs are not available
    // Format: "address|state:STATE_NAME|country:COUNTRY_NAME" if state/country provided but IDs not found
    let addressField = validatedData.address;
    if ((validatedData.state && !stateId) || (validatedData.country && !countryId)) {
      const parts = [addressField];
      if (validatedData.state && !stateId) {
        parts.push(`state:${validatedData.state}`);
      }
      if (validatedData.country && !countryId) {
        parts.push(`country:${validatedData.country}`);
      }
      addressField = parts.join('|');
    }

    // Create address
    const address = await prisma.user_delivery_addresses.create({
      data: {
        tenant_id: tenant.id,
        user_id: customer.id,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        address: addressField,
        city: validatedData.city,
        state_id: stateId,
        country_id: countryId,
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

