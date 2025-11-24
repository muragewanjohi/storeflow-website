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
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const settingsUpdateSchema = z.object({
  // Store Details (store_name and custom_domain are stored in tenants table, not here)
  store_description: z.string().optional().nullable(),
  store_address: z.string().optional().nullable(),
  store_city: z.string().optional().nullable(),
  store_state: z.string().optional().nullable(),
  store_country: z.string().optional().nullable(),
  store_postal_code: z.string().optional().nullable(),
  store_phone: z.string().optional().nullable(),
  store_logo: z.string().optional().nullable(),
  
  // Currency Settings
  currency_code: z.string().max(10).optional(),
  currency_symbol: z.string().max(10).optional().nullable(),
  currency_symbol_position: z.enum(['left', 'right']).optional(),
  currency_thousand_separator: z.string().max(5).optional().nullable(),
  currency_decimal_separator: z.string().max(5).optional().nullable(),
  currency_decimal_places: z.number().int().min(0).max(4).optional(),
  
  // Shipping Methods
  shipping_enabled: z.boolean().optional(),
  shipping_method_type: z.enum(['flat_rate', 'dynamic_rate']).optional(),
  flat_rate_amount: z.number().min(0).optional().nullable(),
  dynamic_rate_per_km: z.number().min(0).optional().nullable(),
  free_shipping_enabled: z.boolean().optional(),
  free_shipping_threshold: z.number().optional().nullable(),
  
  // Payment Methods
  payment_pesapal_enabled: z.boolean().optional(),
  payment_paypal_enabled: z.boolean().optional(),
  payment_cash_on_delivery_enabled: z.boolean().optional(),
  default_payment_method: z.string().optional().nullable(),
  
  // Tax Settings
  tax_enabled: z.boolean().optional(),
  default_tax_rate: z.number().min(0).max(100).optional().nullable(),
  tax_included_in_price: z.boolean().optional(),
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
      
      // Payment Methods
      'payment_pesapal_enabled',
      'payment_paypal_enabled',
      'payment_cash_on_delivery_enabled',
      'default_payment_method',
      
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
      payment_pesapal_enabled: 'true',
      payment_cash_on_delivery_enabled: 'true',
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
      'free_shipping_enabled',
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
    if (result.dynamic_rate_per_km !== undefined && result.dynamic_rate_per_km !== null) {
      result.dynamic_rate_per_km = parseFloat(result.dynamic_rate_per_km);
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
      optionsToSave.store_phone = validatedData.store_phone || null;
    }
    if (validatedData.store_logo !== undefined) {
      optionsToSave.store_logo = validatedData.store_logo || null;
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
    if (validatedData.dynamic_rate_per_km !== undefined) {
      optionsToSave.dynamic_rate_per_km = validatedData.dynamic_rate_per_km?.toString() || null;
    }
    if (validatedData.free_shipping_enabled !== undefined) {
      optionsToSave.free_shipping_enabled = validatedData.free_shipping_enabled.toString();
    }
    if (validatedData.free_shipping_threshold !== undefined) {
      optionsToSave.free_shipping_threshold = validatedData.free_shipping_threshold?.toString() || null;
    }

    // Payment Methods
    if (validatedData.payment_pesapal_enabled !== undefined) {
      optionsToSave.payment_pesapal_enabled = validatedData.payment_pesapal_enabled.toString();
    }
    if (validatedData.payment_paypal_enabled !== undefined) {
      optionsToSave.payment_paypal_enabled = validatedData.payment_paypal_enabled.toString();
    }
    if (validatedData.payment_cash_on_delivery_enabled !== undefined) {
      optionsToSave.payment_cash_on_delivery_enabled = validatedData.payment_cash_on_delivery_enabled.toString();
    }
    if (validatedData.default_payment_method !== undefined) {
      optionsToSave.default_payment_method = validatedData.default_payment_method || null;
    }

    // Tax Settings
    if (validatedData.tax_enabled !== undefined) {
      optionsToSave.tax_enabled = validatedData.tax_enabled.toString();
    }
    if (validatedData.default_tax_rate !== undefined) {
      optionsToSave.default_tax_rate = validatedData.default_tax_rate?.toString() || null;
    }
    if (validatedData.tax_included_in_price !== undefined) {
      optionsToSave.tax_included_in_price = validatedData.tax_included_in_price.toString();
    }
    if (validatedData.tax_calculation_based_on !== undefined) {
      optionsToSave.tax_calculation_based_on = validatedData.tax_calculation_based_on;
    }

    // Save all options
    await setStaticOptions(tenant.id, optionsToSave);

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

