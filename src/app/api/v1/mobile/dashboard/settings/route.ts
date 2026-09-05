import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { getStaticOptions, setStaticOptions } from '@/lib/settings/static-options';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { cache } from '@/lib/cache/simple-cache';
import { isValidE164DigitsString } from '@/lib/phone/parse';
import { validateSubdomain } from '@/lib/subdomain-validation';
import { addTenantDomain, removeTenantDomain } from '@/lib/vercel-domains';

const SETTINGS_KEYS = [
  'store_description',
  'store_logo',
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
  'currency_thousand_separator',
  'currency_decimal_separator',
  'currency_decimal_places',
  'shipping_enabled',
  'shipping_method_type',
  'flat_rate_amount',
  'free_shipping_enabled',
  'free_shipping_threshold',
  'pickup_enabled',
  'pickup_location_name',
  'pickup_instructions',
  'pickup_hours',
  'payment_cash_enabled',
  'payment_mpesa_enabled',
  'payment_tumizi_enabled',
  'payment_mpesa_option',
  'payment_mpesa_send_money_number',
  'payment_mpesa_buy_goods_till',
  'payment_mpesa_paybill_number',
  'payment_mpesa_paybill_account',
  'payment_mpesa_pochi_phone',
  'payment_method',
  'default_payment_method',
  'payment_timing',
  'tax_enabled',
  'default_tax_rate',
  'tax_pricing_type',
  'tax_included_in_price',
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

function asInt(value: string | null | undefined, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function storePhoneDigitsOrNull(v: string | null | undefined): string | null {
  if (v == null || v === '') return null;
  const d = v.replace(/\D/g, '');
  return d || null;
}

type MobileSettingsPayload = {
  store: {
    id: string;
    name: string;
    subdomain: string;
    domain: string;
    contactEmail: string | null;
    description: string | null;
    logo: string | null;
    phone: string | null;
    phone2: string | null;
    phone3: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      postalCode: string | null;
    };
    businessType: string | null;
    selling: string | null;
  };
  countries: Array<{ id: string; name: string; code: string }>;
  currency: {
    code: string;
    symbol: string;
    symbolPosition: string;
    thousandSeparator: string;
    decimalSeparator: string;
    decimalPlaces: number;
  };
  pickup: {
    enabled: boolean;
    locationName: string | null;
    instructions: string | null;
    hours: string | null;
  };
  shipping: {
    enabled: boolean;
    methodType: 'flat_rate' | 'delivery_zones';
    flatRateAmount: number | null;
    freeShippingEnabled: boolean;
    freeShippingThreshold: number | null;
  };
  payment: {
    cashEnabled: boolean;
    mpesaEnabled: boolean;
    tumiziEnabled: boolean;
    mpesaOption: string | null;
    mpesaSendMoneyNumber: string | null;
    mpesaBuyGoodsTill: string | null;
    mpesaPaybillNumber: string | null;
    mpesaPaybillAccount: string | null;
    mpesaPochiPhone: string | null;
    paymentMethod: string;
    defaultMethod: string;
    timing: string;
  };
  tax: {
    enabled: boolean;
    defaultRate: number | null;
    pricingType: 'inclusive' | 'exclusive';
    includedInPrice: boolean;
    calculationBasedOn: string;
  };
};

async function loadMobileSettingsPayload(tenantId: string): Promise<MobileSettingsPayload | null> {
  const [tenant, options, countries] = await Promise.all([
    prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        custom_domain: true,
        contact_email: true,
        data: true,
      },
    }),
    getStaticOptions(tenantId, [...SETTINGS_KEYS]),
    prisma.countries.findMany({
      where: {
        OR: [{ tenant_id: tenantId }, { tenant_id: null }],
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!tenant) return null;

  const tenantData =
    tenant.data && typeof tenant.data === 'object' && !Array.isArray(tenant.data)
      ? (tenant.data as Record<string, unknown>)
      : {};

  const businessType = typeof tenantData.business_type === 'string' ? tenantData.business_type : null;
  const selling = typeof tenantData.selling === 'string' ? tenantData.selling : null;
  const taxPricingType =
    options.tax_pricing_type === 'inclusive' ||
    asBoolean(options.tax_included_in_price, false)
      ? 'inclusive'
      : 'exclusive';

  return {
    store: {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      domain: tenant.custom_domain || `${tenant.subdomain}.dukanest.com`,
      contactEmail: tenant.contact_email,
      description: options.store_description,
      logo:
        options.store_logo && options.store_logo.trim() !== ''
          ? options.store_logo.trim()
          : null,
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
    countries: countries.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code ?? '',
    })),
    currency: {
      code: options.currency_code || 'USD',
      symbol: options.currency_symbol || '$',
      symbolPosition: options.currency_symbol_position || 'left',
      thousandSeparator: options.currency_thousand_separator || ',',
      decimalSeparator: options.currency_decimal_separator || '.',
      decimalPlaces: asInt(options.currency_decimal_places, 2),
    },
    pickup: {
      enabled: asBoolean(options.pickup_enabled, false),
      locationName: options.pickup_location_name ?? null,
      instructions: options.pickup_instructions ?? null,
      hours: options.pickup_hours ?? null,
    },
    shipping: {
      enabled: asBoolean(options.shipping_enabled, true),
      methodType:
        options.shipping_method_type === 'delivery_zones' ? 'delivery_zones' : 'flat_rate',
      flatRateAmount: asNumber(options.flat_rate_amount, null),
      freeShippingEnabled: asBoolean(options.free_shipping_enabled, false),
      freeShippingThreshold: asNumber(options.free_shipping_threshold, null),
    },
    payment: {
      cashEnabled: asBoolean(options.payment_cash_enabled, true),
      mpesaEnabled: asBoolean(options.payment_mpesa_enabled, false),
      tumiziEnabled: asBoolean(options.payment_tumizi_enabled, false),
      mpesaOption: options.payment_mpesa_option || null,
      mpesaSendMoneyNumber: options.payment_mpesa_send_money_number ?? null,
      mpesaBuyGoodsTill: options.payment_mpesa_buy_goods_till ?? null,
      mpesaPaybillNumber: options.payment_mpesa_paybill_number ?? null,
      mpesaPaybillAccount: options.payment_mpesa_paybill_account ?? null,
      mpesaPochiPhone: options.payment_mpesa_pochi_phone ?? null,
      paymentMethod: options.payment_method || options.default_payment_method || 'cash',
      defaultMethod: options.default_payment_method || 'cash',
      timing: options.payment_timing || 'before_delivery',
    },
    tax: {
      enabled: asBoolean(options.tax_enabled, false),
      defaultRate: asNumber(options.default_tax_rate, null),
      pricingType: taxPricingType,
      includedInPrice: taxPricingType === 'inclusive',
      calculationBasedOn: options.tax_calculation_based_on || 'billing_address',
    },
  };
}

const addressPatchSchema = z.object({
  line1: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
});

const mobileSettingsPatchSchema = z.object({
  store: z
    .object({
      name: z.string().min(1).optional(),
      contactEmail: z.string().email().optional(),
      description: z.string().nullable().optional(),
      logo: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      phone2: z.string().nullable().optional(),
      phone3: z.string().nullable().optional(),
      businessType: z.string().nullable().optional(),
      selling: z.string().nullable().optional(),
      subdomain: z
        .string()
        .min(3, 'Subdomain must be at least 3 characters')
        .max(63, 'Subdomain must be at most 63 characters')
        .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
        .optional(),
      address: addressPatchSchema.optional(),
    })
    .optional(),
  currency: z
    .object({
      code: z.string().max(10).optional(),
      symbol: z.string().max(10).nullable().optional(),
      symbolPosition: z.enum(['left', 'right']).optional(),
      thousandSeparator: z.string().max(5).nullable().optional(),
      decimalSeparator: z.string().max(5).nullable().optional(),
      decimalPlaces: z.number().int().min(0).max(4).optional(),
    })
    .optional(),
  pickup: z
    .object({
      enabled: z.boolean().optional(),
      locationName: z.string().nullable().optional(),
      instructions: z.string().nullable().optional(),
      hours: z.string().nullable().optional(),
    })
    .optional(),
  shipping: z
    .object({
      enabled: z.boolean().optional(),
      methodType: z.enum(['flat_rate', 'delivery_zones']).optional(),
      flatRateAmount: z.number().min(0).nullable().optional(),
      freeShippingEnabled: z.boolean().optional(),
      freeShippingThreshold: z.number().nullable().optional(),
    })
    .optional(),
  payment: z
    .object({
      cashEnabled: z.boolean().optional(),
      mpesaEnabled: z.boolean().optional(),
      tumiziEnabled: z.boolean().optional(),
      mpesaOption: z.enum(['send_money', 'buy_goods', 'paybill', 'pochi']).nullable().optional(),
      mpesaSendMoneyNumber: z.string().nullable().optional(),
      mpesaBuyGoodsTill: z.string().nullable().optional(),
      mpesaPaybillNumber: z.string().nullable().optional(),
      mpesaPaybillAccount: z.string().nullable().optional(),
      mpesaPochiPhone: z.string().nullable().optional(),
      paymentMethod: z.enum(['cash', 'mpesa', 'tumizi']).optional(),
      defaultMethod: z.enum(['cash', 'mpesa', 'tumizi']).optional(),
      timing: z.enum(['before_delivery', 'after_delivery', 'user_choice']).optional(),
    })
    .optional(),
  tax: z
    .object({
      enabled: z.boolean().optional(),
      defaultRate: z.number().min(0).max(100).nullable().optional(),
      pricingType: z.enum(['inclusive', 'exclusive']).optional(),
      includedInPrice: z.boolean().optional(),
      calculationBasedOn: z
        .enum(['billing_address', 'shipping_address', 'store_address'])
        .optional(),
    })
    .optional(),
});

function patchHasContent(p: z.infer<typeof mobileSettingsPatchSchema>): boolean {
  if (p.store) {
    const { address, ...rest } = p.store;
    if (Object.values(rest).some((v) => v !== undefined)) return true;
    if (address && Object.values(address).some((v) => v !== undefined)) return true;
  }
  if (p.currency && Object.values(p.currency).some((v) => v !== undefined)) return true;
  if (p.pickup && Object.values(p.pickup).some((v) => v !== undefined)) return true;
  if (p.shipping && Object.values(p.shipping).some((v) => v !== undefined)) return true;
  if (p.payment && Object.values(p.payment).some((v) => v !== undefined)) return true;
  if (p.tax && Object.values(p.tax).some((v) => v !== undefined)) return true;
  return false;
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

    const payload = await loadMobileSettingsPayload(user.tenant_id);
    if (!payload) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess(payload), { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Dashboard Settings GET] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch settings'),
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/v1/mobile/dashboard/settings
 * Partial update; same static_options + tenants columns as web settings. **tenant_admin only.**
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only the store owner can update settings'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = mobileSettingsPatchSchema.parse(body);
    if (!patchHasContent(parsed)) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'No settings fields to update', [
          { field: 'body', message: 'Provide at least one nested field under store, currency, pickup, shipping, payment, or tax' },
        ]),
        { status: 400 },
      );
    }

    const tenantRow = await prisma.tenants.findFirst({
      where: { id: user.tenant_id, deleted_at: null },
      select: { id: true, name: true, contact_email: true, data: true, plan_id: true, subdomain: true },
    });

    if (!tenantRow) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    const currentPlan = tenantRow.plan_id
      ? await prisma.price_plans.findUnique({
          where: { id: tenantRow.plan_id },
          select: { name: true },
        })
      : null;
    const isBasicPlan = currentPlan?.name?.toLowerCase().includes('basic') ?? false;

    const optionsToSave: Record<string, string | null> = {};
    let tenantName: string | undefined;
    let tenantContactEmail: string | undefined;
    let tenantSubdomain: string | undefined;
    let tenantDataPatch: Record<string, unknown> | null = null;

    if (parsed.store) {
      const s = parsed.store;
      if (s.name !== undefined) tenantName = s.name;
      if (s.contactEmail !== undefined) tenantContactEmail = s.contactEmail;
      if (s.subdomain !== undefined) {
        const newSubdomain = s.subdomain.toLowerCase().trim();
        const validation = validateSubdomain(newSubdomain);
        if (!validation.isValid) {
          return NextResponse.json(
            mobileError('VALIDATION_ERROR', validation.error ?? 'Invalid subdomain', [
              { field: 'store.subdomain', message: validation.error ?? 'Invalid subdomain' },
            ]),
            { status: 400 },
          );
        }
        if (newSubdomain !== tenantRow.subdomain) {
          const existingTenant = await prisma.tenants.findFirst({
            where: {
              subdomain: newSubdomain,
              id: { not: user.tenant_id },
              status: { not: 'deleted' },
            },
            select: { id: true },
          });
          if (existingTenant) {
            return NextResponse.json(
              mobileError('VALIDATION_ERROR', 'This store URL is already taken', [
                {
                  field: 'store.subdomain',
                  message: 'Choose a different subdomain — this one is already in use',
                },
              ]),
              { status: 400 },
            );
          }
          tenantSubdomain = newSubdomain;

          const projectId = process.env.VERCEL_PROJECT_ID;
          const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
          const oldSubdomainUrl = `${tenantRow.subdomain}.${baseDomain}`;
          const newSubdomainUrl = `${newSubdomain}.${baseDomain}`;
          if (projectId) {
            removeTenantDomain(oldSubdomainUrl, projectId).catch((error) => {
              console.error(`Failed to remove old subdomain ${oldSubdomainUrl} from Vercel:`, error);
            });
            addTenantDomain(newSubdomainUrl, projectId).catch((error) => {
              console.error(`Failed to add new subdomain ${newSubdomainUrl} to Vercel:`, error);
            });
          }
        }
      }
      if (s.description !== undefined) optionsToSave.store_description = s.description;
      if (s.logo !== undefined) {
        optionsToSave.store_logo =
          s.logo === null || s.logo.trim() === '' ? null : s.logo.trim();
      }
      if (s.phone !== undefined) {
        const d = storePhoneDigitsOrNull(s.phone);
        if (d && !isValidE164DigitsString(d)) {
          return NextResponse.json(
            mobileError('VALIDATION_ERROR', 'Invalid store phone number', [
              { field: 'store.phone', message: 'Use a valid phone number' },
            ]),
            { status: 400 },
          );
        }
        optionsToSave.store_phone = d;
      }
      if (isBasicPlan) {
        optionsToSave.store_phone_2 = null;
        optionsToSave.store_phone_3 = null;
      } else {
        if (s.phone2 !== undefined) {
          const d = storePhoneDigitsOrNull(s.phone2);
          if (d && !isValidE164DigitsString(d)) {
            return NextResponse.json(
              mobileError('VALIDATION_ERROR', 'Invalid additional store phone (2)', [
                { field: 'store.phone2', message: 'Use a valid phone number' },
              ]),
              { status: 400 },
            );
          }
          optionsToSave.store_phone_2 = d;
        }
        if (s.phone3 !== undefined) {
          const d = storePhoneDigitsOrNull(s.phone3);
          if (d && !isValidE164DigitsString(d)) {
            return NextResponse.json(
              mobileError('VALIDATION_ERROR', 'Invalid additional store phone (3)', [
                { field: 'store.phone3', message: 'Use a valid phone number' },
              ]),
              { status: 400 },
            );
          }
          optionsToSave.store_phone_3 = d;
        }
      }
      if (s.businessType !== undefined || s.selling !== undefined) {
        const existing =
          tenantRow.data && typeof tenantRow.data === 'object' && !Array.isArray(tenantRow.data)
            ? { ...(tenantRow.data as Record<string, unknown>) }
            : {};
        if (s.businessType !== undefined) {
          existing.business_type = s.businessType;
        }
        if (s.selling !== undefined) {
          existing.selling = s.selling;
        }
        tenantDataPatch = existing;
      }
      if (s.address) {
        const a = s.address;
        if (a.line1 !== undefined) optionsToSave.store_address = a.line1;
        if (a.city !== undefined) optionsToSave.store_city = a.city;
        if (a.state !== undefined) optionsToSave.store_state = a.state;
        if (a.country !== undefined) optionsToSave.store_country = a.country;
        if (a.postalCode !== undefined) optionsToSave.store_postal_code = a.postalCode;
      }
    }

    if (parsed.currency) {
      const c = parsed.currency;
      if (c.code !== undefined) optionsToSave.currency_code = c.code;
      if (c.symbol !== undefined) optionsToSave.currency_symbol = c.symbol;
      if (c.symbolPosition !== undefined) optionsToSave.currency_symbol_position = c.symbolPosition;
      if (c.thousandSeparator !== undefined) {
        optionsToSave.currency_thousand_separator = c.thousandSeparator || null;
      }
      if (c.decimalSeparator !== undefined) {
        optionsToSave.currency_decimal_separator = c.decimalSeparator || null;
      }
      if (c.decimalPlaces !== undefined) {
        optionsToSave.currency_decimal_places = String(c.decimalPlaces);
      }
    }

    if (parsed.pickup) {
      const p = parsed.pickup;
      if (p.enabled !== undefined) {
        const currentAddress = await getStaticOptions(user.tenant_id, [
          'store_address',
          'store_city',
          'store_country',
        ]);
        const patchAddress = parsed.store?.address;
        const hasPhysicalAddress = !!(
          patchAddress?.line1 ||
          (patchAddress?.city && patchAddress?.country) ||
          (currentAddress.store_address &&
            currentAddress.store_city &&
            currentAddress.store_country)
        );
        if (p.enabled && !hasPhysicalAddress) {
          return NextResponse.json(
            mobileError(
              'VALIDATION_ERROR',
              'Store pickup requires a physical address. Please add store address first.',
              [{ field: 'pickup.enabled', message: 'Add store address before enabling pickup' }],
            ),
            { status: 400 },
          );
        }
        optionsToSave.pickup_enabled = String(p.enabled);
      }
      if (p.locationName !== undefined) {
        optionsToSave.pickup_location_name = p.locationName || null;
      }
      if (p.instructions !== undefined) {
        optionsToSave.pickup_instructions = p.instructions || null;
      }
      if (p.hours !== undefined) {
        optionsToSave.pickup_hours = p.hours || null;
      }
    }

    if (parsed.shipping) {
      const sh = parsed.shipping;
      if (sh.enabled !== undefined) optionsToSave.shipping_enabled = String(sh.enabled);
      if (sh.methodType !== undefined) optionsToSave.shipping_method_type = sh.methodType;
      if (sh.flatRateAmount !== undefined) {
        optionsToSave.flat_rate_amount =
          sh.flatRateAmount === null ? null : String(sh.flatRateAmount);
      }
      if (sh.freeShippingEnabled !== undefined) {
        optionsToSave.free_shipping_enabled = String(sh.freeShippingEnabled);
      }
      if (sh.freeShippingThreshold !== undefined) {
        optionsToSave.free_shipping_threshold =
          sh.freeShippingThreshold === null ? null : String(sh.freeShippingThreshold);
      }
    }

    const paymentTouched = parsed.payment && Object.values(parsed.payment).some((v) => v !== undefined);

    if (parsed.payment) {
      const pay = parsed.payment;
      if (pay.cashEnabled !== undefined) optionsToSave.payment_cash_enabled = String(pay.cashEnabled);
      if (pay.mpesaEnabled !== undefined) optionsToSave.payment_mpesa_enabled = String(pay.mpesaEnabled);
      if (pay.tumiziEnabled !== undefined) optionsToSave.payment_tumizi_enabled = String(pay.tumiziEnabled);
      if (pay.mpesaOption !== undefined) optionsToSave.payment_mpesa_option = pay.mpesaOption;
      if (pay.mpesaSendMoneyNumber !== undefined) {
        optionsToSave.payment_mpesa_send_money_number = pay.mpesaSendMoneyNumber || null;
      }
      if (pay.mpesaBuyGoodsTill !== undefined) {
        optionsToSave.payment_mpesa_buy_goods_till = pay.mpesaBuyGoodsTill || null;
      }
      if (pay.mpesaPaybillNumber !== undefined) {
        optionsToSave.payment_mpesa_paybill_number = pay.mpesaPaybillNumber || null;
      }
      if (pay.mpesaPaybillAccount !== undefined) {
        optionsToSave.payment_mpesa_paybill_account = pay.mpesaPaybillAccount || null;
      }
      if (pay.mpesaPochiPhone !== undefined) {
        optionsToSave.payment_mpesa_pochi_phone = pay.mpesaPochiPhone || null;
      }
      if (pay.timing !== undefined) optionsToSave.payment_timing = pay.timing;
      if (pay.paymentMethod !== undefined) {
        optionsToSave.payment_method = pay.paymentMethod;
        // keep backward-compatible key in sync
        optionsToSave.default_payment_method = pay.paymentMethod;
      } else if (pay.defaultMethod !== undefined) {
        optionsToSave.default_payment_method = pay.defaultMethod;
        optionsToSave.payment_method = pay.defaultMethod;
      }
    }

    if (parsed.tax) {
      const t = parsed.tax;
      if (t.enabled !== undefined) optionsToSave.tax_enabled = String(t.enabled);
      if (t.defaultRate !== undefined) {
        optionsToSave.default_tax_rate = t.defaultRate === null ? null : String(t.defaultRate);
      }
      if (t.calculationBasedOn !== undefined) {
        optionsToSave.tax_calculation_based_on = t.calculationBasedOn;
      }
      if (t.pricingType !== undefined) {
        optionsToSave.tax_pricing_type = t.pricingType;
        optionsToSave.tax_included_in_price = String(t.pricingType === 'inclusive');
      } else if (t.includedInPrice !== undefined) {
        optionsToSave.tax_included_in_price = String(t.includedInPrice);
        optionsToSave.tax_pricing_type = t.includedInPrice ? 'inclusive' : 'exclusive';
      }
    }

    if (paymentTouched) {
      const current = await getStaticOptions(user.tenant_id, [
        'payment_cash_enabled',
        'payment_mpesa_enabled',
        'payment_tumizi_enabled',
        'payment_method',
        'default_payment_method',
      ]);
      const cashNow = asBoolean(current.payment_cash_enabled, true);
      const mpesaNow = asBoolean(current.payment_mpesa_enabled, false);
      const tumiziNow = asBoolean(current.payment_tumizi_enabled, false);
      const nextCash =
        parsed.payment?.cashEnabled !== undefined ? parsed.payment.cashEnabled : cashNow;
      const nextMpesa =
        parsed.payment?.mpesaEnabled !== undefined ? parsed.payment.mpesaEnabled : mpesaNow;
      const nextTumizi =
        parsed.payment?.tumiziEnabled !== undefined ? parsed.payment.tumiziEnabled : tumiziNow;
      if (!nextCash && !nextMpesa && !nextTumizi) {
        return NextResponse.json(
          mobileError('VALIDATION_ERROR', 'At least one payment method must be enabled', [
            { field: 'payment', message: 'Enable cash, M-Pesa, or Tumizi' },
          ]),
          { status: 400 },
        );
      }

      const effectiveDefaultMethod =
        parsed.payment?.paymentMethod ??
        parsed.payment?.defaultMethod ??
        current.payment_method ??
        current.default_payment_method ??
        'cash';

      if (effectiveDefaultMethod === 'cash' && !nextCash) {
        return NextResponse.json(
          mobileError(
            'VALIDATION_ERROR',
            'Cash payments are disabled. Pick another default payment method.',
            [{ field: 'payment.defaultMethod', message: 'Cash is not enabled' }],
          ),
          { status: 400 },
        );
      }
      if (effectiveDefaultMethod === 'mpesa' && !nextMpesa) {
        return NextResponse.json(
          mobileError(
            'VALIDATION_ERROR',
            'M-Pesa is disabled. Pick another default payment method.',
            [{ field: 'payment.defaultMethod', message: 'M-Pesa is not enabled' }],
          ),
          { status: 400 },
        );
      }
      if (effectiveDefaultMethod === 'tumizi' && !nextTumizi) {
        return NextResponse.json(
          mobileError(
            'VALIDATION_ERROR',
            'Tumizi is disabled. Pick another default payment method.',
            [{ field: 'payment.defaultMethod', message: 'Tumizi is not enabled' }],
          ),
          { status: 400 },
        );
      }
    }

    if (Object.keys(optionsToSave).length > 0) {
      await setStaticOptions(user.tenant_id, optionsToSave);
    }

    const tenantUpdate: {
      name?: string;
      contact_email?: string;
      subdomain?: string;
      data?: object;
    } = {};

    if (tenantName !== undefined) tenantUpdate.name = tenantName;
    if (tenantContactEmail !== undefined) tenantUpdate.contact_email = tenantContactEmail;
    if (tenantSubdomain !== undefined) tenantUpdate.subdomain = tenantSubdomain;
    if (tenantDataPatch !== null) tenantUpdate.data = tenantDataPatch;

    if (Object.keys(tenantUpdate).length > 0) {
      await prisma.tenants.update({
        where: { id: user.tenant_id },
        data: tenantUpdate,
      });
    }

    cache.delete(`${user.tenant_id}:currency`);

    const payload = await loadMobileSettingsPayload(user.tenant_id);
    if (!payload) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess(payload), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid settings payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Dashboard Settings PATCH] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to update settings'),
      { status: 500 },
    );
  }
}
