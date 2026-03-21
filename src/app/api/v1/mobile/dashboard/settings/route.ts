import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { getStaticOptions } from '@/lib/settings/static-options';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const SETTINGS_KEYS = [
  'store_description',
  'store_phone',
  'store_phone_2',
  'store_phone_3',
  'store_address',
  'store_city',
  'store_state',
  'store_country',
  'store_postal_code',
  'currency_code',
  'currency_symbol',
  'currency_symbol_position',
  'shipping_enabled',
  'free_shipping_enabled',
  'free_shipping_threshold',
  'payment_cash_enabled',
  'payment_mpesa_enabled',
  'payment_mpesa_option',
  'default_payment_method',
  'tax_enabled',
  'default_tax_rate',
  'tax_calculation_based_on',
] as const;

function asBoolean(value: string | null | undefined, fallback = false): boolean {
  if (value === null || value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function asNumber(value: string | null | undefined, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard settings'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const [tenant, options] = await Promise.all([
      prisma.tenants.findUnique({
        where: { id: user.tenant_id },
        select: {
          id: true,
          name: true,
          subdomain: true,
          custom_domain: true,
          contact_email: true,
          data: true,
        },
      }),
      getStaticOptions(user.tenant_id, [...SETTINGS_KEYS]),
    ]);

    if (!tenant) {
      return NextResponse.json(
        mobileError('NOT_FOUND', 'Tenant not found'),
        { status: 404 },
      );
    }

    const tenantData =
      tenant.data && typeof tenant.data === 'object' && !Array.isArray(tenant.data)
        ? (tenant.data as Record<string, unknown>)
        : {};

    const businessType = typeof tenantData.business_type === 'string' ? tenantData.business_type : null;
    const selling = typeof tenantData.selling === 'string' ? tenantData.selling : null;

    return NextResponse.json(
      mobileSuccess({
        store: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          domain: tenant.custom_domain || `${tenant.subdomain}.dukanest.com`,
          contactEmail: tenant.contact_email,
          description: options.store_description,
          phone: options.store_phone,
          phone2: options.store_phone_2 ?? null,
          phone3: options.store_phone_3 ?? null,
          address: {
            line1: options.store_address,
            city: options.store_city,
            state: options.store_state,
            country: options.store_country,
            postalCode: options.store_postal_code,
          },
          businessType,
          selling,
        },
        currency: {
          code: options.currency_code || 'USD',
          symbol: options.currency_symbol || '$',
          symbolPosition: options.currency_symbol_position || 'left',
        },
        shipping: {
          enabled: asBoolean(options.shipping_enabled, true),
          freeShippingEnabled: asBoolean(options.free_shipping_enabled, false),
          freeShippingThreshold: asNumber(options.free_shipping_threshold, null),
        },
        payment: {
          cashEnabled: asBoolean(options.payment_cash_enabled, true),
          mpesaEnabled: asBoolean(options.payment_mpesa_enabled, false),
          mpesaOption: options.payment_mpesa_option || null,
          defaultMethod: options.default_payment_method || 'cash',
        },
        tax: {
          enabled: asBoolean(options.tax_enabled, false),
          defaultRate: asNumber(options.default_tax_rate, null),
          calculationBasedOn: options.tax_calculation_based_on || 'billing_address',
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Dashboard Settings] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch settings'),
      { status: 500 },
    );
  }
}

