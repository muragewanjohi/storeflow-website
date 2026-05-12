/**
 * Tenant Settings API Route
 * 
 * GET: Get all tenant settings
 * PUT: Update tenant settings
 * 
 * WHERE SETTINGS ARE SAVED:
 * - Most settings are saved to the `static_options` table with structure:
 *   - tenant_id: UUID (links to tenants table)
 *   - option_name: VARCHAR(255) (e.g., 'currency_code', 'shipping_enabled')
 *   - option_value: TEXT (the actual setting value as a string)
 * 
 * - Store name (store_name) is stored in the `tenants` table in the `name` column
 * - Contact email is stored in the `tenants` table in the `contact_email` column
 * 
 * The static_options table uses a unique constraint on (tenant_id, option_name) to ensure
 * one value per setting per tenant. Settings are retrieved and updated using the helper
 * functions in @/lib/settings/static-options.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { getStaticOptions, setStaticOptions } from '@/lib/settings/static-options';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { cache } from '@/lib/cache/simple-cache';
import { isValidE164DigitsString } from '@/lib/phone/parse';

function storePhoneDigitsOrNull(v: string | null | undefined): string | null {
  if (v == null || v === '') return null;
  const d = v.replace(/\D/g, '');
  return d || null;
}

const settingsUpdateSchema = z.object({
  // Store Details (store_name and custom_domain are stored in tenants table, not here)
  store_description: z.string().optional().nullable(),
  store_address: z.string().optional().nullable(),
  store_city: z.string().optional().nullable(),
  store_state: z.string().optional().nullable(),
  store_country: z.string().optional().nullable(),
  store_postal_code: z.string().optional().nullable(),
  store_phone: z.string().optional().nullable(),
  /** Pro (non-Basic) plans only; cleared server-side for Basic tenants */
  store_phone_2: z.string().optional().nullable(),
  store_phone_3: z.string().optional().nullable(),
  store_logo: z.string().optional().nullable(),
  business_type: z.string().optional().nullable(),
  selling: z.string().optional().nullable(),
  
  // Currency Settings
  currency_code: z.string().max(10).optional(),
  currency_symbol: z.string().max(10).optional().nullable(),
  currency_symbol_position: z.enum(['left', 'right']).optional(),
  currency_thousand_separator: z.string().max(5).optional().nullable(),
  currency_decimal_separator: z.string().max(5).optional().nullable(),
  currency_decimal_places: z.number().int().min(0).max(4).optional(),
  
  // Shipping Methods
  shipping_enabled: z.boolean().optional(),
  shipping_method_type: z.enum(['flat_rate', 'delivery_zones']).optional(),
  flat_rate_amount: z.number().min(0).optional().nullable(),
  free_shipping_enabled: z.boolean().optional(),
  free_shipping_threshold: z.number().optional().nullable(),
  
  // Pickup Options
  pickup_enabled: z.boolean().optional(),
  pickup_location_name: z.string().optional().nullable(),
  pickup_instructions: z.string().optional().nullable(),
  pickup_hours: z.string().optional().nullable(), // JSON string of weekly hours
  
  // Payment Methods
  payment_cash_enabled: z.boolean().optional(),
  payment_mpesa_enabled: z.boolean().optional(),
  payment_mpesa_option: z.enum(['send_money', 'buy_goods', 'paybill', 'pochi']).optional(),
  payment_mpesa_send_money_number: z.string().optional().nullable(),
  payment_mpesa_buy_goods_till: z.string().optional().nullable(),
  payment_mpesa_paybill_number: z.string().optional().nullable(),
  payment_mpesa_paybill_account: z.string().optional().nullable(),
  payment_mpesa_pochi_phone: z.string().optional().nullable(),
  payment_method: z.enum(['cash', 'mpesa', 'tumizi']).optional(),
  default_payment_method: z.enum(['cash', 'mpesa', 'tumizi']).optional(), // Keep for backward compatibility
  payment_timing: z.enum(['before_delivery', 'after_delivery', 'user_choice']).optional(),
  
  // Tax Settings
  tax_enabled: z.boolean().optional(),
  default_tax_rate: z.number().min(0).max(100).optional().nullable(),
  tax_pricing_type: z.enum(['inclusive', 'exclusive']).optional(),
  tax_included_in_price: z.boolean().optional(), // Keep for backward compatibility
  tax_calculation_based_on: z.enum(['billing_address', 'shipping_address', 'store_address']).optional(),
});

/**
 * GET /api/dashboard/settings
 * Get all tenant settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');

    // Get all settings from static_options
    const settings = await getStaticOptions(tenant.id, [
      // Store Details (store_name and custom_domain come from tenants table)
      'store_description',
      'store_logo',
      'store_address',
      'store_city',
      'store_state',
      'store_country',
      'store_postal_code',
      'store_phone',
      'store_phone_2',
      'store_phone_3',
      
      // Currency Settings
      'currency_code',
      'currency_symbol',
      'currency_symbol_position',
      'currency_thousand_separator',
      'currency_decimal_separator',
      'currency_decimal_places',
      
      // Shipping Methods
      'shipping_enabled',
      'default_shipping_method',
      'free_shipping_enabled',
      'free_shipping_threshold',
      
      // Pickup Options
      'pickup_enabled',
      'pickup_location_name',
      'pickup_instructions',
      'pickup_hours',
      'pickup_location_name',
      'pickup_instructions',
      'pickup_hours',
      
      // Payment Methods
      'payment_cash_enabled',
      'payment_mpesa_enabled',
      'payment_mpesa_option',
      'payment_mpesa_send_money_number',
      'payment_mpesa_buy_goods_till',
      'payment_mpesa_paybill_number',
      'payment_mpesa_paybill_account',
      'payment_mpesa_pochi_phone',
      'payment_method',
      'default_payment_method',
      'payment_tumizi_enabled',
      
      // Tax Settings
      'tax_enabled',
      'default_tax_rate',
      'tax_included_in_price',
      'tax_calculation_based_on',
    ]);

    // Set defaults
    const defaults: Record<string, string> = {
      currency_code: 'USD',
      currency_symbol: '$',
      currency_symbol_position: 'left',
      currency_thousand_separator: ',',
      currency_decimal_separator: '.',
      currency_decimal_places: '2',
      shipping_enabled: 'true',
      shipping_method_type: 'flat_rate',
      payment_cash_enabled: 'true',
      default_payment_method: 'cash',
      payment_timing: 'before_delivery',
      tax_enabled: 'false',
      tax_included_in_price: 'false',
      tax_calculation_based_on: 'billing_address',
    };

    // Merge defaults with actual values
    const result: Record<string, any> = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      result[key] = settings[key] !== null ? settings[key] : defaultValue;
    }

    // Add all other settings
    for (const [key, value] of Object.entries(settings)) {
      if (!(key in defaults)) {
        result[key] = value;
      }
    }

    // Convert string booleans to actual booleans
    const booleanFields = [
      'shipping_enabled',
      'pickup_enabled',
      'free_shipping_enabled',
      'payment_cash_enabled',
      'payment_mpesa_enabled',
      'payment_tumizi_enabled',
      'payment_pesapal_enabled',
      'payment_paypal_enabled',
      'payment_cash_on_delivery_enabled',
      'tax_enabled',
      'tax_included_in_price',
    ];

    for (const field of booleanFields) {
      if (result[field] !== undefined) {
        result[field] = result[field] === 'true' || result[field] === true;
      }
    }

    // Convert numeric fields
    if (result.currency_decimal_places !== undefined) {
      result.currency_decimal_places = parseInt(result.currency_decimal_places) || 2;
    }
    if (result.free_shipping_threshold !== undefined && result.free_shipping_threshold !== null) {
      result.free_shipping_threshold = parseFloat(result.free_shipping_threshold);
    }
    if (result.default_tax_rate !== undefined && result.default_tax_rate !== null) {
      result.default_tax_rate = parseFloat(result.default_tax_rate);
    }
    if (result.flat_rate_amount !== undefined && result.flat_rate_amount !== null) {
      result.flat_rate_amount = parseFloat(result.flat_rate_amount);
    }

    // Add store name and domain from tenants table
    result.store_name = tenant.name;
    result.store_domain = tenant.custom_domain || `${tenant.subdomain}.dukanest.com`;

    // Get countries for dropdown
    const countries = await prisma.countries.findMany({
      where: {
        OR: [
          { tenant_id: tenant.id },
          { tenant_id: null }, // Global countries
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ 
      settings: result,
      countries,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dashboard/settings
 * Update tenant settings
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');

    const body = await request.json();
    const validatedData = settingsUpdateSchema.parse(body);

    const currentPlan = tenant.plan_id
      ? await prisma.price_plans.findUnique({
          where: { id: tenant.plan_id },
          select: { name: true },
        })
      : null;
    const isBasicPlan = currentPlan?.name?.toLowerCase().includes('basic') ?? false;

    // Convert to string format for static_options
    const optionsToSave: Record<string, string | null> = {};

    // Store Details (store_name is stored in tenants table, update it separately if needed)
    if (validatedData.store_description !== undefined) {
      optionsToSave.store_description = validatedData.store_description || null;
    }
    if (validatedData.store_address !== undefined) {
      optionsToSave.store_address = validatedData.store_address || null;
    }
    if (validatedData.store_city !== undefined) {
      optionsToSave.store_city = validatedData.store_city || null;
    }
    if (validatedData.store_state !== undefined) {
      optionsToSave.store_state = validatedData.store_state || null;
    }
    if (validatedData.store_country !== undefined) {
      optionsToSave.store_country = validatedData.store_country || null;
    }
    if (validatedData.store_postal_code !== undefined) {
      optionsToSave.store_postal_code = validatedData.store_postal_code || null;
    }
    if (validatedData.store_phone !== undefined) {
      const d = storePhoneDigitsOrNull(validatedData.store_phone);
      if (d && !isValidE164DigitsString(d)) {
        return NextResponse.json({ error: 'Invalid store phone number' }, { status: 400 });
      }
      optionsToSave.store_phone = d;
    }
    if (isBasicPlan) {
      optionsToSave.store_phone_2 = null;
      optionsToSave.store_phone_3 = null;
    } else {
      if (validatedData.store_phone_2 !== undefined) {
        const d = storePhoneDigitsOrNull(validatedData.store_phone_2);
        if (d && !isValidE164DigitsString(d)) {
          return NextResponse.json({ error: 'Invalid additional store phone (2)' }, { status: 400 });
        }
        optionsToSave.store_phone_2 = d;
      }
      if (validatedData.store_phone_3 !== undefined) {
        const d = storePhoneDigitsOrNull(validatedData.store_phone_3);
        if (d && !isValidE164DigitsString(d)) {
          return NextResponse.json({ error: 'Invalid additional store phone (3)' }, { status: 400 });
        }
        optionsToSave.store_phone_3 = d;
      }
    }
    if (validatedData.store_logo !== undefined) {
      optionsToSave.store_logo = validatedData.store_logo || null;
    }

    // Tenant profile data stored in tenants.data JSON
    if (validatedData.business_type !== undefined || validatedData.selling !== undefined) {
      const existingTenant = await prisma.tenants.findUnique({
        where: { id: tenant.id },
        select: { data: true },
      });
      const existingData =
        existingTenant?.data && typeof existingTenant.data === 'object' && !Array.isArray(existingTenant.data)
          ? (existingTenant.data as Record<string, unknown>)
          : {};
      const nextData: Record<string, unknown> = { ...existingData };

      if (validatedData.business_type !== undefined) {
        const businessType = validatedData.business_type?.trim();
        if (businessType) {
          nextData.business_type = businessType;
        } else {
          delete nextData.business_type;
        }
      }

      if (validatedData.selling !== undefined) {
        const selling = validatedData.selling?.trim();
        if (selling) {
          nextData.selling = selling;
        } else {
          delete nextData.selling;
        }
      }

      await prisma.tenants.update({
        where: { id: tenant.id },
        data: { data: nextData as Prisma.InputJsonValue },
      });
    }

    // Currency Settings
    if (validatedData.currency_code !== undefined) {
      optionsToSave.currency_code = validatedData.currency_code;
    }
    if (validatedData.currency_symbol !== undefined) {
      optionsToSave.currency_symbol = validatedData.currency_symbol || null;
    }
    if (validatedData.currency_symbol_position !== undefined) {
      optionsToSave.currency_symbol_position = validatedData.currency_symbol_position;
    }
    if (validatedData.currency_thousand_separator !== undefined) {
      optionsToSave.currency_thousand_separator = validatedData.currency_thousand_separator || null;
    }
    if (validatedData.currency_decimal_separator !== undefined) {
      optionsToSave.currency_decimal_separator = validatedData.currency_decimal_separator || null;
    }
    if (validatedData.currency_decimal_places !== undefined) {
      optionsToSave.currency_decimal_places = validatedData.currency_decimal_places.toString();
    }

    // Shipping Methods
    if (validatedData.shipping_enabled !== undefined) {
      optionsToSave.shipping_enabled = validatedData.shipping_enabled.toString();
    }
    if (validatedData.shipping_method_type !== undefined) {
      optionsToSave.shipping_method_type = validatedData.shipping_method_type;
    }
    if (validatedData.flat_rate_amount !== undefined) {
      optionsToSave.flat_rate_amount = validatedData.flat_rate_amount?.toString() || null;
    }
    if (validatedData.free_shipping_enabled !== undefined) {
      optionsToSave.free_shipping_enabled = validatedData.free_shipping_enabled.toString();
    }
    if (validatedData.free_shipping_threshold !== undefined) {
      optionsToSave.free_shipping_threshold = validatedData.free_shipping_threshold?.toString() || null;
    }
    
    // Pickup Options
    if (validatedData.pickup_enabled !== undefined) {
      // Get current settings to check if address exists
      const currentSettings = await getStaticOptions(tenant.id, [
        'store_address',
        'store_city',
        'store_country',
      ]);
      
      // Validate that pickup can only be enabled if store has physical address
      const hasPhysicalAddress = !!(
        validatedData.store_address ||
        (currentSettings.store_address && currentSettings.store_city && currentSettings.store_country)
      );
      
      if (validatedData.pickup_enabled && !hasPhysicalAddress) {
        return NextResponse.json(
          { error: 'Store pickup requires a physical address. Please add store address first.' },
          { status: 400 }
        );
      }
      
      optionsToSave.pickup_enabled = validatedData.pickup_enabled.toString();
    }
    if (validatedData.pickup_location_name !== undefined) {
      optionsToSave.pickup_location_name = validatedData.pickup_location_name || null;
    }
    if (validatedData.pickup_instructions !== undefined) {
      optionsToSave.pickup_instructions = validatedData.pickup_instructions || null;
    }
    if (validatedData.pickup_hours !== undefined) {
      optionsToSave.pickup_hours = validatedData.pickup_hours || null;
    }

    // Payment Methods
    if (validatedData.payment_cash_enabled !== undefined) {
      optionsToSave.payment_cash_enabled = validatedData.payment_cash_enabled.toString();
    }
    if (validatedData.payment_mpesa_enabled !== undefined) {
      optionsToSave.payment_mpesa_enabled = validatedData.payment_mpesa_enabled.toString();
    }
    if (validatedData.payment_mpesa_option !== undefined) {
      optionsToSave.payment_mpesa_option = validatedData.payment_mpesa_option;
    }
    if (validatedData.payment_mpesa_send_money_number !== undefined) {
      optionsToSave.payment_mpesa_send_money_number = validatedData.payment_mpesa_send_money_number || null;
    }
    if (validatedData.payment_mpesa_buy_goods_till !== undefined) {
      optionsToSave.payment_mpesa_buy_goods_till = validatedData.payment_mpesa_buy_goods_till || null;
    }
    if (validatedData.payment_mpesa_paybill_number !== undefined) {
      optionsToSave.payment_mpesa_paybill_number = validatedData.payment_mpesa_paybill_number || null;
    }
    if (validatedData.payment_mpesa_paybill_account !== undefined) {
      optionsToSave.payment_mpesa_paybill_account = validatedData.payment_mpesa_paybill_account || null;
    }
    if (validatedData.payment_mpesa_pochi_phone !== undefined) {
      optionsToSave.payment_mpesa_pochi_phone = validatedData.payment_mpesa_pochi_phone || null;
    }
    if (validatedData.payment_method !== undefined) {
      optionsToSave.payment_method = validatedData.payment_method;
      // Also update default_payment_method for backward compatibility
      optionsToSave.default_payment_method = validatedData.payment_method;
    } else if (validatedData.default_payment_method !== undefined) {
      // Fallback for backward compatibility
      optionsToSave.default_payment_method = validatedData.default_payment_method;
      optionsToSave.payment_method = validatedData.default_payment_method;
    }
    if (validatedData.payment_timing !== undefined) {
      optionsToSave.payment_timing = validatedData.payment_timing;
    }
    
    // Validation: Ensure at least one payment method is enabled
    // Get current settings to check existing values
    const currentPaymentSettings = await getStaticOptions(tenant.id, [
      'payment_cash_enabled',
      'payment_mpesa_enabled',
      'payment_tumizi_enabled',
      'payment_method',
      'default_payment_method',
    ]);

    const tumiziIntegration = await getTumiziTenantConfigByTenantId(tenant.id);
    const tumiziLive =
      tumiziIntegration?.enabled === true && !!tumiziIntegration?.merchantExternalId;

    const cashEnabled = validatedData.payment_cash_enabled !== undefined 
      ? validatedData.payment_cash_enabled 
      : (currentPaymentSettings.payment_cash_enabled === 'true' || currentPaymentSettings.payment_cash_enabled === null);
    const mpesaEnabled = validatedData.payment_mpesa_enabled !== undefined 
      ? validatedData.payment_mpesa_enabled 
      : (currentPaymentSettings.payment_mpesa_enabled === 'true');
    const tumiziOffered =
      currentPaymentSettings.payment_tumizi_enabled === 'true' || tumiziLive;

    if (!cashEnabled && !mpesaEnabled && !tumiziOffered) {
      return NextResponse.json(
        { error: 'At least one payment method must be enabled' },
        { status: 400 }
      );
    }

    const effectivePaymentMethod =
      validatedData.payment_method ??
      validatedData.default_payment_method ??
      currentPaymentSettings.payment_method ??
      currentPaymentSettings.default_payment_method ??
      'cash';

    if (effectivePaymentMethod === 'cash' && !cashEnabled) {
      return NextResponse.json(
        { error: 'Cash payments are disabled. Pick another default payment method.' },
        { status: 400 },
      );
    }
    if (effectivePaymentMethod === 'mpesa' && !mpesaEnabled) {
      return NextResponse.json(
        { error: 'M-Pesa is disabled. Pick another default payment method.' },
        { status: 400 },
      );
    }
    if (effectivePaymentMethod === 'tumizi' && !tumiziOffered) {
      return NextResponse.json(
        { error: 'Tumizi checkout is not available for this store.' },
        { status: 400 },
      );
    }

    // Tax Settings
    if (validatedData.tax_enabled !== undefined) {
      optionsToSave.tax_enabled = validatedData.tax_enabled.toString();
    }
    if (validatedData.default_tax_rate !== undefined) {
      optionsToSave.default_tax_rate = validatedData.default_tax_rate?.toString() || null;
    }
    if (validatedData.tax_pricing_type !== undefined) {
      optionsToSave.tax_pricing_type = validatedData.tax_pricing_type;
      // Also update tax_included_in_price for backward compatibility
      optionsToSave.tax_included_in_price = (validatedData.tax_pricing_type === 'inclusive').toString();
    } else if (validatedData.tax_included_in_price !== undefined) {
      // Fallback for backward compatibility
      optionsToSave.tax_included_in_price = validatedData.tax_included_in_price.toString();
      optionsToSave.tax_pricing_type = validatedData.tax_included_in_price ? 'inclusive' : 'exclusive';
    }
    if (validatedData.tax_calculation_based_on !== undefined) {
      optionsToSave.tax_calculation_based_on = validatedData.tax_calculation_based_on;
    }

    // Save all options
    await setStaticOptions(tenant.id, optionsToSave);

    // Clear currency cache so changes take effect immediately
    cache.delete(`${tenant.id}:currency`);

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: validatedData,
    });
  } catch (error) {
    console.error('Error updating settings:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

