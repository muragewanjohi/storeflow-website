/**
 * Wiring tests for the mobile POS routes — auth gating, validation, and
 * response shaping. The sale math itself is covered by
 * src/lib/pos/__tests__/create-sale.test.ts.
 */

import { NextResponse } from 'next/server';
import { POST as salesPOST } from '../sales/route';
import { GET as bootstrapGET } from '../bootstrap/route';
import {
  requireMobileTenantStaff,
  mobileTenantMustAllowWrites,
} from '@/lib/auth/mobile-dashboard-tenant';
import { createPosSale, PosSaleError } from '@/lib/pos/create-sale';
import { prisma } from '@/lib/prisma/client';
import { getStaticOptions } from '@/lib/settings/static-options';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';

jest.mock('@/lib/auth/mobile-dashboard-tenant', () => ({
  requireMobileTenantStaff: jest.fn(),
  mobileTenantMustAllowWrites: jest.fn(() => null),
}));

jest.mock('@/lib/pos/create-sale', () => {
  // Local re-implementation of PosSaleError so `instanceof` works in the route
  // without pulling the real module's deep import chain (next/cache) into jsdom.
  class PosSaleError extends Error {
    status: number;
    code: string;
    constructor(message: string, status = 400, code = 'VALIDATION_ERROR') {
      super(message);
      this.name = 'PosSaleError';
      this.status = status;
      this.code = code;
    }
  }
  return { PosSaleError, createPosSale: jest.fn() };
});

jest.mock('@/lib/prisma/client', () => ({
  prisma: { products: { findMany: jest.fn() } },
}));

jest.mock('@/lib/settings/static-options', () => ({ getStaticOptions: jest.fn() }));

jest.mock('@/lib/tumizi/config', () => ({
  getTumiziTenantConfigByTenantId: jest.fn(async () => null),
}));

const mockRequireStaff = requireMobileTenantStaff as jest.Mock;
const mockMustAllowWrites = mobileTenantMustAllowWrites as jest.Mock;
const mockCreatePosSale = createPosSale as jest.Mock;
const mockProductsFindMany = (prisma as unknown as { products: { findMany: jest.Mock } }).products
  .findMany;
const mockGetStaticOptions = getStaticOptions as jest.Mock;
const mockTumiziConfig = getTumiziTenantConfigByTenantId as jest.Mock;

const TENANT = { id: 'tenant-1', name: 'Test Store', country: 'KE' };
const STAFF_CTX = { user: { id: 'user-1' }, tenantId: 'tenant-1', tenant: TENANT };

const VALID_BODY = {
  client_sale_id: '33333333-3333-4333-8333-333333333333',
  receipt_number: 'POS-AB12-000042',
  items: [
    {
      product_id: '11111111-1111-4111-8111-111111111111',
      variant_id: null,
      quantity: 2,
      unit_price: 250,
    },
  ],
  payment: { method: 'cash' },
};

function req(body: unknown, url = 'http://localhost/api/v1/mobile/pos/sales') {
  return { url, json: async () => body, headers: new Headers() } as unknown as Parameters<
    typeof salesPOST
  >[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireStaff.mockResolvedValue({ ok: true, ctx: STAFF_CTX });
  mockMustAllowWrites.mockReturnValue(null);
});

describe('POST /api/v1/mobile/pos/sales', () => {
  it('returns the auth gate response when unauthenticated', async () => {
    mockRequireStaff.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ success: false }, { status: 401 }),
    });

    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mockCreatePosSale).not.toHaveBeenCalled();
  });

  it('blocks writes when the subscription disallows them', async () => {
    mockMustAllowWrites.mockReturnValue(NextResponse.json({ success: false }, { status: 403 }));

    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(403);
    expect(mockCreatePosSale).not.toHaveBeenCalled();
  });

  it('returns 400 with field details on an invalid payload', async () => {
    const res = await salesPOST(req({ receipt_number: '', items: [] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(json.error.details)).toBe(true);
    expect(mockCreatePosSale).not.toHaveBeenCalled();
  });

  it('creates a sale and returns 201 for a new sale', async () => {
    mockCreatePosSale.mockResolvedValue({
      id: 'order-1',
      order_number: 'ORD-1',
      total: 500,
      deduplicated: false,
    });

    const res = await salesPOST(req(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.sale.order_number).toBe('ORD-1');
    expect(mockCreatePosSale).toHaveBeenCalledWith(TENANT, 'user-1', expect.objectContaining({
      client_sale_id: VALID_BODY.client_sale_id,
    }));
  });

  it('returns 200 (not 201) for an idempotent replay', async () => {
    mockCreatePosSale.mockResolvedValue({ id: 'order-1', order_number: 'ORD-1', deduplicated: true });

    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(200);
  });

  it('maps a PosSaleError to its status and code', async () => {
    mockCreatePosSale.mockRejectedValue(
      new PosSaleError('POS sales are not available on demo stores', 403, 'FORBIDDEN'),
    );

    const res = await salesPOST(req(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('returns 500 on an unexpected error', async () => {
    mockCreatePosSale.mockRejectedValue(new Error('kaboom'));

    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/v1/mobile/pos/bootstrap', () => {
  beforeEach(() => {
    mockProductsFindMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Widget',
        sku: 'W1',
        barcode: '5012345678900',
        image: null,
        price: 250,
        sale_price: null,
        cost_price: 100,
        stock_quantity: 5,
        updated_at: new Date('2026-08-30T00:00:00Z'),
        product_variants: [],
      },
    ]);
    mockGetStaticOptions.mockResolvedValue({
      tax_enabled: 'true',
      default_tax_rate: '16',
      tax_pricing_type: 'exclusive',
      tax_included_in_price: null,
      payment_cash_enabled: 'true',
      payment_mpesa_enabled: 'false',
      currency_code: 'KES',
      currency_symbol: 'KSh',
      currency_symbol_position: 'before',
      currency_decimal_places: '2',
      store_description: null,
      store_logo: null,
      store_phone: null,
      store_address: null,
      store_city: null,
      store_state: null,
      store_country: null,
    });
  });

  it('returns the auth gate response when unauthenticated', async () => {
    mockRequireStaff.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ success: false }, { status: 401 }),
    });

    const res = await bootstrapGET(req(null, 'http://localhost/api/v1/mobile/pos/bootstrap'));
    expect(res.status).toBe(401);
  });

  it('returns catalog + settings snapshot', async () => {
    const res = await bootstrapGET(req(null, 'http://localhost/api/v1/mobile/pos/bootstrap'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.product_count).toBe(1);
    expect(json.data.products[0]).toMatchObject({ id: 'p1', barcode: '5012345678900', has_variants: false });
    expect(json.data.settings.tax).toEqual({ enabled: true, rate: 16, pricing_type: 'exclusive' });
    expect(json.data.settings.payments).toEqual({
      cash_enabled: true,
      mpesa_enabled: false,
      mpesa_stk_enabled: false,
    });
    expect(json.data.settings.store.name).toBe('Test Store');
    expect(typeof json.data.captured_at).toBe('string');
    expect(json.data.delta).toBe(false);
  });

  it('reports mpesa_stk_enabled when Tumizi is live for the store', async () => {
    mockTumiziConfig.mockResolvedValue({
      enabled: true,
      merchantExternalId: 'merchant-123',
    });
    const res = await bootstrapGET(
      req(null, 'http://localhost/api/v1/mobile/pos/bootstrap'),
    );
    const json = await res.json();
    expect(json.data.settings.payments.mpesa_stk_enabled).toBe(true);
  });

  it('flags a delta response when ?since= is supplied', async () => {
    const res = await bootstrapGET(
      req(null, 'http://localhost/api/v1/mobile/pos/bootstrap?since=2026-08-01T00:00:00Z'),
    );
    const json = await res.json();
    expect(json.data.delta).toBe(true);
    const whereArg = mockProductsFindMany.mock.calls[0][0].where;
    expect(whereArg.updated_at).toEqual({ gte: new Date('2026-08-01T00:00:00Z') });
  });
});
