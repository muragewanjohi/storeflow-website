/**
 * Tenant Settings Page
 * 
 * General settings for the tenant including store details, currency, shipping, payment, and tax settings
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getStaticOptions } from '@/lib/settings/static-options';
import { prisma } from '@/lib/prisma/client';
import TenantSettingsClient from './tenant-settings-client';

export default async function TenantSettingsPage() {
  // Require authentication and tenant_admin role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch all settings with error handling
  let settings: Record<string, string | null> = {};
  try {
    settings = await getStaticOptions(tenant.id, [
      // Store Details (store_name comes from tenants table)
      'store_description',
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
      'shipping_method_type',
      'flat_rate_amount',
      'dynamic_rate_per_km',
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
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Continue with empty settings object - defaults will be used
  }

  // Get countries for dropdown with error handling
  let countries: Array<{ id: string; name: string; code: string | null }> = [];
  try {
    countries = await prisma.countries.findMany({
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
  } catch (error) {
    console.error('Error fetching countries:', error);
    // Continue with empty countries array - user can still use text input
  }

  // Set defaults and format
  const formattedSettings: Record<string, any> = {
    // Store Details (store_name comes from tenants table)
    store_name: tenant.name,
    store_description: settings.store_description || '',
    store_address: settings.store_address || '',
    store_city: settings.store_city || '',
    store_state: settings.store_state || '',
    store_country: settings.store_country || '',
    store_postal_code: settings.store_postal_code || '',
    store_phone: settings.store_phone || '',
    
    // Currency Settings
    currency_code: settings.currency_code || 'USD',
    currency_symbol: settings.currency_symbol || '$',
    currency_symbol_position: settings.currency_symbol_position || 'left',
    currency_thousand_separator: settings.currency_thousand_separator || ',',
    currency_decimal_separator: settings.currency_decimal_separator || '.',
    currency_decimal_places: settings.currency_decimal_places ? parseInt(settings.currency_decimal_places) : 2,
    
    // Shipping Methods
    shipping_enabled: settings.shipping_enabled === 'true' || settings.shipping_enabled === null,
    shipping_method_type: settings.shipping_method_type || 'flat_rate',
    flat_rate_amount: settings.flat_rate_amount ? parseFloat(settings.flat_rate_amount) : null,
    dynamic_rate_per_km: settings.dynamic_rate_per_km ? parseFloat(settings.dynamic_rate_per_km) : null,
    free_shipping_enabled: settings.free_shipping_enabled === 'true',
    free_shipping_threshold: settings.free_shipping_threshold ? parseFloat(settings.free_shipping_threshold) : null,
    
    // Payment Methods
    payment_pesapal_enabled: settings.payment_pesapal_enabled === 'true' || settings.payment_pesapal_enabled === null,
    payment_paypal_enabled: settings.payment_paypal_enabled === 'true',
    payment_cash_on_delivery_enabled: settings.payment_cash_on_delivery_enabled === 'true' || settings.payment_cash_on_delivery_enabled === null,
    default_payment_method: settings.default_payment_method || '',
    
    // Tax Settings
    tax_enabled: settings.tax_enabled === 'true',
    default_tax_rate: settings.default_tax_rate ? parseFloat(settings.default_tax_rate) : null,
    tax_included_in_price: settings.tax_included_in_price === 'true',
    tax_calculation_based_on: settings.tax_calculation_based_on || 'billing_address',
  };

  return <TenantSettingsClient tenant={tenant} initialSettings={formattedSettings} countries={countries} />;
}

