/**
 * Checkout Settings API Route
 * 
 * GET: Get store settings needed for checkout (pickup enabled, store address, etc.)
 * This is a public endpoint (no auth required) as it's needed for checkout
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getStaticOptions } from '@/lib/settings/static-options';

export const dynamic = 'force-dynamic';

/**
 * GET /api/checkout/settings - Get checkout settings
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();

    // Get settings needed for checkout
    const settings = await getStaticOptions(tenant.id, [
      'pickup_enabled',
      'shipping_enabled',
      'shipping_method_type',
      'store_address',
      'store_city',
      'store_state',
      'store_country',
      'store_postal_code',
      'store_phone',
    ]);

    // Check if pickup can be enabled (requires physical address)
    const hasPhysicalAddress = !!(
      settings.store_address &&
      settings.store_city &&
      settings.store_country
    );

    const pickupEnabled = settings.pickup_enabled === 'true' && hasPhysicalAddress;
    const shippingEnabled = settings.shipping_enabled !== 'false'; // Default to true

    return NextResponse.json({
      success: true,
      settings: {
        pickup_enabled: pickupEnabled,
        shipping_enabled: shippingEnabled,
        shipping_method_type: settings.shipping_method_type || 'flat_rate',
        store_address: settings.store_address || null,
        store_city: settings.store_city || null,
        store_state: settings.store_state || null,
        store_country: settings.store_country || null,
        store_postal_code: settings.store_postal_code || null,
        store_phone: settings.store_phone || null,
        // Full formatted address for display
        store_full_address: hasPhysicalAddress
          ? [
              settings.store_address,
              settings.store_city,
              settings.store_state,
              settings.store_postal_code,
              settings.store_country,
            ]
              .filter(Boolean)
              .join(', ')
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching checkout settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch checkout settings' },
      { status: error.status || 500 }
    );
  }
}
