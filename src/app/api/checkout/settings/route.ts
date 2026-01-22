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
      'payment_cash_enabled',
      'payment_mpesa_enabled',
      'payment_mpesa_option',
      'payment_mpesa_send_money_number',
      'payment_mpesa_buy_goods_till',
      'payment_mpesa_paybill_number',
      'payment_mpesa_paybill_account',
      'payment_mpesa_pochi_phone',
      'payment_method',
      'default_payment_method', // Keep for backward compatibility
      'payment_timing',
    ]);

    // Check if pickup can be enabled (requires physical address)
    const hasPhysicalAddress = !!(
      settings.store_address &&
      settings.store_city &&
      settings.store_country
    );

    const pickupEnabled = settings.pickup_enabled === 'true' && hasPhysicalAddress;
    const shippingEnabled = settings.shipping_enabled !== 'false'; // Default to true

    // Payment methods
    const payment_cash_enabled = settings.payment_cash_enabled === 'true' || settings.payment_cash_enabled === null;
    const payment_mpesa_enabled = settings.payment_mpesa_enabled === 'true';
    const payment_method = settings.payment_method || settings.default_payment_method || 'cash';
    const payment_timing = settings.payment_timing || 'user_choice';

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
        // Payment methods
        payment_cash_enabled,
        payment_mpesa_enabled,
        payment_mpesa_option: settings.payment_mpesa_option || null,
        payment_mpesa_send_money_number: settings.payment_mpesa_send_money_number || null,
        payment_mpesa_buy_goods_till: settings.payment_mpesa_buy_goods_till || null,
        payment_mpesa_paybill_number: settings.payment_mpesa_paybill_number || null,
        payment_mpesa_paybill_account: settings.payment_mpesa_paybill_account || null,
        payment_mpesa_pochi_phone: settings.payment_mpesa_pochi_phone || null,
        payment_method,
        default_payment_method: payment_method, // Keep for backward compatibility
        payment_timing,
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
