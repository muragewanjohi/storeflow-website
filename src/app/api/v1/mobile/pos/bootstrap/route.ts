/**
 * GET /api/v1/mobile/pos/bootstrap
 *
 * One call the Flutter POS makes (when online) to fill / refresh its offline
 * cache: the sellable catalog + the store settings needed to compute totals
 * and render a receipt.
 *
 * Design: storeflow/docs/POS_OFFLINE_DESIGN.md §6.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { getStaticOptions } from '@/lib/settings/static-options';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';

// Full snapshot capped well above the largest plan's product limit (Pro = 1,000).
const MAX_PRODUCTS = 5000;

const SETTINGS_KEYS = [
  'store_description',
  'store_logo',
  'store_phone',
  'store_address',
  'store_city',
  'store_state',
  'store_country',
  'currency_code',
  'currency_symbol',
  'currency_symbol_position',
  'currency_decimal_places',
  'tax_enabled',
  'default_tax_rate',
  'tax_pricing_type',
  'tax_included_in_price',
  'payment_cash_enabled',
  'payment_mpesa_enabled',
];

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const { tenantId, tenant } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const sinceRaw = searchParams.get('since');
    const since = sinceRaw ? new Date(sinceRaw) : null;
    const sinceValid = since && !Number.isNaN(since.getTime()) ? since : null;

    const [productRows, settings, tumiziConfig] = await Promise.all([
      prisma.products.findMany({
        where: {
          tenant_id: tenantId,
          status: { in: ['active', 'draft'] },
          ...(sinceValid ? { updated_at: { gte: sinceValid } } : {}),
        },
        orderBy: { name: 'asc' },
        take: MAX_PRODUCTS,
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          image: true,
          price: true,
          sale_price: true,
          cost_price: true,
          stock_quantity: true,
          updated_at: true,
          product_variants: {
            select: {
              id: true,
              sku: true,
              barcode: true,
              image: true,
              price: true,
              cost_price: true,
              stock_quantity: true,
              product_variant_attributes: {
                select: {
                  attributes: { select: { name: true } },
                  attribute_values: { select: { value: true } },
                },
              },
            },
          },
        },
      }),
      getStaticOptions(tenantId, SETTINGS_KEYS),
      getTumiziTenantConfigByTenantId(tenantId).catch(() => null),
    ]);

    const mpesaStkEnabled =
      tumiziConfig?.enabled === true && !!tumiziConfig.merchantExternalId;

    const products = productRows.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      image: p.image,
      price: Number(p.price),
      sale_price: p.sale_price != null ? Number(p.sale_price) : null,
      cost_price: p.cost_price != null ? Number(p.cost_price) : null,
      stock_quantity: p.stock_quantity,
      has_variants: p.product_variants.length > 0,
      updated_at: p.updated_at,
      variants: p.product_variants.map((v) => ({
        id: v.id,
        product_id: p.id,
        sku: v.sku,
        barcode: v.barcode,
        image: v.image,
        price: v.price != null ? Number(v.price) : Number(p.price),
        cost_price: v.cost_price != null ? Number(v.cost_price) : (p.cost_price != null ? Number(p.cost_price) : null),
        stock_quantity: v.stock_quantity,
        attributes: v.product_variant_attributes.map((a) => ({
          name: a.attributes?.name ?? '',
          value: a.attribute_values?.value ?? '',
        })),
      })),
    }));

    const taxRate = settings.default_tax_rate ? parseFloat(settings.default_tax_rate) : null;

    return NextResponse.json(
      mobileSuccess({
        captured_at: new Date().toISOString(),
        delta: !!sinceValid,
        product_count: products.length,
        products,
        settings: {
          store: {
            name: tenant.name,
            description: settings.store_description,
            logo: settings.store_logo,
            phone: settings.store_phone,
            address: settings.store_address,
            city: settings.store_city,
            state: settings.store_state,
            country: settings.store_country,
          },
          currency: {
            code: settings.currency_code || 'KES',
            symbol: settings.currency_symbol || 'KSh',
            symbol_position: settings.currency_symbol_position || 'before',
            decimal_places: settings.currency_decimal_places
              ? parseInt(settings.currency_decimal_places, 10)
              : 2,
          },
          tax: {
            enabled: settings.tax_enabled === 'true',
            rate: taxRate,
            pricing_type:
              settings.tax_pricing_type ||
              (settings.tax_included_in_price === 'true' ? 'inclusive' : 'exclusive'),
          },
          payments: {
            cash_enabled:
              settings.payment_cash_enabled === 'true' || settings.payment_cash_enabled === null,
            mpesa_enabled: settings.payment_mpesa_enabled === 'true',
            // Tumizi customer STK is live for this store — POS can charge M-Pesa.
            mpesa_stk_enabled: mpesaStkEnabled,
          },
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile POS bootstrap]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to load POS data'),
      { status: 500 },
    );
  }
}
