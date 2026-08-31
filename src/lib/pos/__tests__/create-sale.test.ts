/**
 * Tests for the POS sale creation core (src/lib/pos/create-sale.ts).
 *
 * Covers: idempotency (dedupe + P2002 race), line/order discounts, tax
 * inclusive/exclusive, COGS capture, oversell (allowed + flagged), stock
 * decrement + inventory_history, demo-store/demo-product/variant rejects,
 * plan-limit advisory, and change-due.
 */

import type { Tenant } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma/client';
import { getStaticOptions } from '@/lib/settings/static-options';
import { canCreateOrder } from '@/lib/subscriptions/limits';
import { checkIsDemoStore } from '@/lib/demo-store/restrictions';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { initiateTumiziCustomerPaymentForOrder } from '@/lib/tumizi/initiate-order-payment';
import { PosSaleError, createPosSale } from '@/lib/pos/create-sale';
import type { PosSaleInput } from '@/lib/pos/validation';

jest.mock('@/lib/prisma/client', () => ({
  prisma: {
    orders: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    products: { findMany: jest.fn(), update: jest.fn() },
    product_variants: { findMany: jest.fn(), update: jest.fn() },
    inventory_history: { create: jest.fn() },
  },
}));

jest.mock('@/lib/orders/utils', () => ({
  generateOrderNumber: jest.fn(() => 'ORD-20260831-000001'),
}));

jest.mock('@/lib/invoices/generate-invoice-number', () => ({
  generateInvoiceNumber: jest.fn(async () => 'INV-2026-001'),
}));

jest.mock('@/lib/inventory/sync-product-stock', () => ({
  syncProductStockFromVariants: jest.fn(async () => undefined),
}));

jest.mock('@/lib/settings/static-options', () => ({
  getStaticOptions: jest.fn(),
}));

jest.mock('@/lib/subscriptions/limits', () => ({
  canCreateOrder: jest.fn(async () => ({ allowed: true })),
}));

jest.mock('@/lib/demo-store/restrictions', () => ({
  checkIsDemoStore: jest.fn(async () => false),
}));

jest.mock('@/lib/tumizi/config', () => ({
  getTumiziTenantConfigByTenantId: jest.fn(async () => null),
}));

jest.mock('@/lib/tumizi/phone', () => ({
  normalizeKenyaMsisdnForTumizi: jest.fn((raw: string) => {
    const digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('254') && digits.length >= 12) return digits.slice(0, 12);
    if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith('7')) return `254${digits}`;
    return null;
  }),
}));

jest.mock('@/lib/tumizi/initiate-order-payment', () => ({
  initiateTumiziCustomerPaymentForOrder: jest.fn(async () => ({
    externalReference: 'order-x-123',
    accountReference: 'Store / INV-2026-001',
    response: {},
  })),
}));

const mockPrisma = prisma as unknown as {
  orders: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  products: { findMany: jest.Mock; update: jest.Mock };
  product_variants: { findMany: jest.Mock; update: jest.Mock };
  inventory_history: { create: jest.Mock };
};
const mockGetStaticOptions = getStaticOptions as jest.Mock;
const mockCanCreateOrder = canCreateOrder as jest.Mock;
const mockCheckIsDemoStore = checkIsDemoStore as jest.Mock;
const mockSyncStock = syncProductStockFromVariants as jest.Mock;
const mockTumiziConfig = getTumiziTenantConfigByTenantId as jest.Mock;
const mockTumiziInitiate = initiateTumiziCustomerPaymentForOrder as jest.Mock;

const TENANT: Tenant = { id: 'tenant-1', name: 'Test Store' } as Tenant;
const USER_ID = 'user-1';
const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const VARIANT_ID = '22222222-2222-4222-8222-222222222222';
const SALE_ID = '33333333-3333-4333-8333-333333333333';

const NO_TAX = {
  tax_enabled: 'false',
  default_tax_rate: null,
  tax_pricing_type: null,
  tax_included_in_price: null,
};

function makeInput(overrides: Partial<PosSaleInput> = {}): PosSaleInput {
  return {
    client_sale_id: SALE_ID,
    receipt_number: 'POS-AB12-000042',
    pos_device_label: 'Front counter',
    items: [
      { product_id: PRODUCT_ID, variant_id: null, quantity: 2, unit_price: 250, discount_amount: 0 },
    ],
    order_discount_amount: 0,
    payment: { method: 'cash', status: 'paid', amount_tendered: null, reference: null },
    ...overrides,
  } as PosSaleInput;
}

function stubProduct(over: Record<string, unknown> = {}) {
  return {
    id: PRODUCT_ID,
    name: 'Widget',
    cost_price: 100,
    stock_quantity: 50,
    metadata: {},
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.orders.findFirst.mockResolvedValue(null);
  mockPrisma.orders.findUnique.mockResolvedValue(null);
  mockPrisma.orders.create.mockResolvedValue({ id: 'order-1', created_at: new Date('2026-08-31T10:00:00Z') });
  mockPrisma.orders.delete.mockResolvedValue({});
  mockPrisma.products.findMany.mockResolvedValue([stubProduct()]);
  mockPrisma.product_variants.findMany.mockResolvedValue([]);
  mockPrisma.products.update.mockResolvedValue({});
  mockPrisma.product_variants.update.mockResolvedValue({});
  mockPrisma.inventory_history.create.mockResolvedValue({});
  mockGetStaticOptions.mockResolvedValue(NO_TAX);
  mockCanCreateOrder.mockResolvedValue({ allowed: true });
  mockCheckIsDemoStore.mockResolvedValue(false);
  mockTumiziConfig.mockResolvedValue(null);
  mockTumiziInitiate.mockResolvedValue({
    externalReference: 'order-x-123',
    accountReference: 'ref',
    response: {},
  });
});

describe('createPosSale — happy path (cash, no tax)', () => {
  it('creates a completed/paid POS order with correct totals', async () => {
    const result = await createPosSale(TENANT, USER_ID, makeInput());

    expect(result.total).toBe(500);
    expect(result.subtotal).toBe(500);
    expect(result.tax_amount).toBe(0);
    expect(result.discount_total).toBe(0);
    expect(result.status).toBe('completed');
    expect(result.payment_status).toBe('paid');
    expect(result.order_number).toBe('ORD-20260831-000001');
    expect(result.invoice_number).toBe('INV-2026-001');
    expect(result.deduplicated).toBe(false);
    expect(result.oversold).toEqual([]);
    expect(result.over_limit).toBe(false);

    const data = mockPrisma.orders.create.mock.calls[0][0].data;
    expect(data.channel).toBe('pos');
    expect(data.checkout_type).toBe('pos');
    expect(data.status).toBe('completed');
    expect(data.payment_status).toBe('paid');
    expect(data.payment_gateway).toBe('cash');
    expect(data.client_sale_id).toBe(SALE_ID);
    expect(data.served_by).toBe(USER_ID);
    expect(Number(data.total_amount)).toBe(500);
    expect(data.delivery_fee).toBeNull();
  });

  it('decrements product stock and writes an inventory_history sale row', async () => {
    await createPosSale(TENANT, USER_ID, makeInput());

    expect(mockPrisma.products.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: { stock_quantity: { decrement: 2 } },
    });
    const hist = mockPrisma.inventory_history.create.mock.calls[0][0].data;
    expect(hist.adjustment_type).toBe('sale');
    expect(hist.reason).toBe('pos_sale');
    expect(hist.quantity_change).toBe(-2);
    expect(hist.quantity_before).toBe(50);
    expect(hist.quantity_after).toBe(48);
    expect(hist.adjusted_by).toBe(USER_ID);
  });

  it('captures COGS from product cost_price', async () => {
    await createPosSale(TENANT, USER_ID, makeInput());
    const line = mockPrisma.orders.create.mock.calls[0][0].data.order_products.create[0];
    expect(Number(line.unit_cost_at_sale)).toBe(100);
    expect(Number(line.cogs_total)).toBe(200);
    expect(Number(line.total)).toBe(500);
  });
});

describe('createPosSale — tax', () => {
  it('adds exclusive tax on top of the subtotal', async () => {
    mockGetStaticOptions.mockResolvedValue({
      tax_enabled: 'true',
      default_tax_rate: '16',
      tax_pricing_type: 'exclusive',
      tax_included_in_price: null,
    });

    const result = await createPosSale(TENANT, USER_ID, makeInput());
    expect(result.subtotal).toBe(500);
    expect(result.tax_amount).toBe(80);
    expect(result.total).toBe(580);
  });

  it('derives inclusive tax without changing the total', async () => {
    mockGetStaticOptions.mockResolvedValue({
      tax_enabled: 'true',
      default_tax_rate: '16',
      tax_pricing_type: 'inclusive',
      tax_included_in_price: null,
    });

    const result = await createPosSale(TENANT, USER_ID, makeInput());
    expect(result.total).toBe(500);
    expect(result.tax_amount).toBeCloseTo(68.97, 2);
  });
});

describe('createPosSale — discounts', () => {
  it('applies line and order discounts to the subtotal', async () => {
    const result = await createPosSale(
      TENANT,
      USER_ID,
      makeInput({
        items: [
          { product_id: PRODUCT_ID, variant_id: null, quantity: 2, unit_price: 250, discount_amount: 50 },
        ],
        order_discount_amount: 20,
      }),
    );

    expect(result.discount_total).toBe(70);
    expect(result.subtotal).toBe(430);
    expect(result.total).toBe(430);

    const line = mockPrisma.orders.create.mock.calls[0][0].data.order_products.create[0];
    expect(Number(line.discount_amount)).toBe(50);
    expect(Number(line.total)).toBe(450);
  });

  it('clamps a line discount to the line gross', async () => {
    const result = await createPosSale(
      TENANT,
      USER_ID,
      makeInput({
        items: [
          { product_id: PRODUCT_ID, variant_id: null, quantity: 1, unit_price: 100, discount_amount: 999 },
        ],
      }),
    );
    expect(result.subtotal).toBe(0);
  });
});

describe('createPosSale — variants', () => {
  it('uses variant cost_price and stock, and syncs product stock', async () => {
    mockPrisma.products.findMany.mockResolvedValue([stubProduct({ cost_price: 100, stock_quantity: 10 })]);
    mockPrisma.product_variants.findMany.mockResolvedValue([
      { id: VARIANT_ID, product_id: PRODUCT_ID, cost_price: 130, stock_quantity: 4 },
    ]);

    await createPosSale(
      TENANT,
      USER_ID,
      makeInput({
        items: [
          { product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 2, unit_price: 250, discount_amount: 0 },
        ],
      }),
    );

    expect(mockPrisma.product_variants.update).toHaveBeenCalledWith({
      where: { id: VARIANT_ID },
      data: { stock_quantity: { decrement: 2 } },
    });
    const line = mockPrisma.orders.create.mock.calls[0][0].data.order_products.create[0];
    expect(Number(line.unit_cost_at_sale)).toBe(130);
    expect(Number(line.cogs_total)).toBe(260);
    expect(mockSyncStock).toHaveBeenCalledWith(PRODUCT_ID, TENANT.id);
  });

  it('rejects a variant that does not belong to the line product', async () => {
    mockPrisma.product_variants.findMany.mockResolvedValue([
      { id: VARIANT_ID, product_id: 'other-product', cost_price: 130, stock_quantity: 4 },
    ]);

    await expect(
      createPosSale(
        TENANT,
        USER_ID,
        makeInput({
          items: [
            { product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 1, unit_price: 250, discount_amount: 0 },
          ],
        }),
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('createPosSale — oversell', () => {
  it('still completes the sale but flags lines sold below recorded stock', async () => {
    mockPrisma.products.findMany.mockResolvedValue([stubProduct({ stock_quantity: 1 })]);

    const result = await createPosSale(
      TENANT,
      USER_ID,
      makeInput({
        items: [
          { product_id: PRODUCT_ID, variant_id: null, quantity: 3, unit_price: 250, discount_amount: 0 },
        ],
      }),
    );

    expect(result.oversold).toEqual([
      { product_id: PRODUCT_ID, variant_id: null, name: 'Widget', available: 1, sold: 3 },
    ]);
    expect(mockPrisma.orders.create).toHaveBeenCalled();
    expect(mockPrisma.products.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: { stock_quantity: { decrement: 3 } },
    });
  });

  it('does not flag oversell when stock is untracked (null)', async () => {
    mockPrisma.products.findMany.mockResolvedValue([stubProduct({ stock_quantity: null })]);
    const result = await createPosSale(
      TENANT,
      USER_ID,
      makeInput({
        items: [
          { product_id: PRODUCT_ID, variant_id: null, quantity: 99, unit_price: 10, discount_amount: 0 },
        ],
      }),
    );
    expect(result.oversold).toEqual([]);
  });
});

describe('createPosSale — idempotency', () => {
  it('returns the existing order and skips all writes when client_sale_id already exists', async () => {
    mockPrisma.orders.findFirst.mockResolvedValue({
      id: 'order-existing',
      order_number: 'ORD-20260831-000009',
      invoice_number: 'INV-2026-009',
      client_sale_id: SALE_ID,
      total_amount: 500,
      amount_tendered: 600,
      change_due: 100,
      payment_status: 'paid',
      status: 'completed',
      created_at: new Date('2026-08-31T09:00:00Z'),
    });

    const result = await createPosSale(TENANT, USER_ID, makeInput());

    expect(result.deduplicated).toBe(true);
    expect(result.id).toBe('order-existing');
    expect(result.order_number).toBe('ORD-20260831-000009');
    expect(result.change_due).toBe(100);
    expect(mockPrisma.orders.create).not.toHaveBeenCalled();
    expect(mockPrisma.products.update).not.toHaveBeenCalled();
    expect(mockPrisma.inventory_history.create).not.toHaveBeenCalled();
  });

  it('treats a P2002 unique-violation on create as an idempotent replay', async () => {
    mockPrisma.orders.findFirst
      .mockResolvedValueOnce(null) // step 1: not found
      .mockResolvedValueOnce({
        // in the catch: the concurrent winner
        id: 'order-winner',
        order_number: 'ORD-20260831-000007',
        invoice_number: 'INV-2026-007',
        client_sale_id: SALE_ID,
        total_amount: 500,
        amount_tendered: null,
        change_due: null,
        payment_status: 'paid',
        status: 'completed',
        created_at: new Date(),
      });
    mockPrisma.orders.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

    const result = await createPosSale(TENANT, USER_ID, makeInput());

    expect(result.deduplicated).toBe(true);
    expect(result.id).toBe('order-winner');
  });

  it('rethrows a non-P2002 create failure', async () => {
    mockPrisma.orders.create.mockRejectedValue(Object.assign(new Error('boom'), { code: 'P2010' }));
    await expect(createPosSale(TENANT, USER_ID, makeInput())).rejects.toThrow('boom');
  });
});

describe('createPosSale — rejects', () => {
  it('rejects demo stores', async () => {
    mockCheckIsDemoStore.mockResolvedValue(true);
    await expect(createPosSale(TENANT, USER_ID, makeInput())).rejects.toBeInstanceOf(PosSaleError);
    await expect(createPosSale(TENANT, USER_ID, makeInput())).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects unknown products', async () => {
    mockPrisma.products.findMany.mockResolvedValue([]);
    await expect(createPosSale(TENANT, USER_ID, makeInput())).rejects.toMatchObject({ status: 404 });
  });

  it('rejects demo products', async () => {
    mockPrisma.products.findMany.mockResolvedValue([stubProduct({ metadata: { is_demo: true } })]);
    await expect(createPosSale(TENANT, USER_ID, makeInput())).rejects.toBeInstanceOf(PosSaleError);
  });

  it('rejects starter-pack AI products', async () => {
    mockPrisma.products.findMany.mockResolvedValue([
      stubProduct({ metadata: { source: 'starter_pack_ai' } }),
    ]);
    await expect(createPosSale(TENANT, USER_ID, makeInput())).rejects.toBeInstanceOf(PosSaleError);
  });
});

describe('createPosSale — plan limit + change due', () => {
  it('flags over_limit but still completes the sale', async () => {
    mockCanCreateOrder.mockResolvedValue({ allowed: false, reason: 'Order limit reached' });
    const result = await createPosSale(TENANT, USER_ID, makeInput());
    expect(result.over_limit).toBe(true);
    expect(mockPrisma.orders.create).toHaveBeenCalled();
  });

  it('computes change due from amount tendered', async () => {
    const result = await createPosSale(
      TENANT,
      USER_ID,
      makeInput({
        payment: { method: 'cash', status: 'paid', amount_tendered: 600, reference: null },
      }),
    );
    expect(result.amount_tendered).toBe(600);
    expect(result.change_due).toBe(100);
    expect(Number(mockPrisma.orders.create.mock.calls[0][0].data.change_due)).toBe(100);
  });

  it('retries order-number generation on collision', async () => {
    mockPrisma.orders.findUnique
      .mockResolvedValueOnce({ id: 'taken' })
      .mockResolvedValueOnce(null);
    const result = await createPosSale(TENANT, USER_ID, makeInput());
    expect(result.order_number).toBe('ORD-20260831-000001');
    expect(mockPrisma.orders.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe('createPosSale — M-Pesa (Tumizi)', () => {
  const mpesaInput = () =>
    makeInput({
      payment: {
        method: 'mpesa',
        status: 'paid',
        amount_tendered: null,
        reference: null,
        phone_number: '0712345678',
      },
    });

  beforeEach(() => {
    mockTumiziConfig.mockResolvedValue({
      enabled: true,
      merchantExternalId: 'merchant-123',
    });
  });

  it('creates a pending Tumizi order and fires the STK push', async () => {
    const result = await createPosSale(TENANT, USER_ID, mpesaInput());

    expect(result.payment_status).toBe('pending');
    expect(result.requires_payment_confirmation).toBe(true);
    expect(result.tumizi_external_reference).toBe('order-x-123');

    const data = mockPrisma.orders.create.mock.calls[0][0].data;
    expect(data.payment_status).toBe('pending');
    expect(data.payment_gateway).toBe('tumizi');
    expect(data.transaction_id).toBeNull();

    expect(mockTumiziInitiate).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '254712345678', tenantId: TENANT.id }),
    );
    // Stock decremented, audit row written (after a successful STK push).
    expect(mockPrisma.products.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: { stock_quantity: { decrement: 2 } },
    });
    expect(mockPrisma.inventory_history.create).toHaveBeenCalled();
  });

  it('rejects when Tumizi is not configured for the store', async () => {
    mockTumiziConfig.mockResolvedValue(null);
    await expect(createPosSale(TENANT, USER_ID, mpesaInput())).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    });
    expect(mockPrisma.orders.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid M-Pesa phone number', async () => {
    await expect(
      createPosSale(
        TENANT,
        USER_ID,
        makeInput({
          payment: {
            method: 'mpesa',
            status: 'paid',
            amount_tendered: null,
            reference: null,
            phone_number: '12345',
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockPrisma.orders.create).not.toHaveBeenCalled();
  });

  it('rolls back stock and deletes the order when the STK push fails', async () => {
    mockPrisma.orders.delete.mockResolvedValue({});
    mockTumiziInitiate.mockRejectedValue(new Error('Tumizi unreachable'));

    await expect(createPosSale(TENANT, USER_ID, mpesaInput())).rejects.toMatchObject({
      status: 502,
    });

    expect(mockPrisma.products.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: { stock_quantity: { increment: 2 } },
    });
    expect(mockPrisma.orders.delete).toHaveBeenCalledWith({
      where: { id: 'order-1', tenant_id: TENANT.id },
    });
    expect(mockPrisma.inventory_history.create).not.toHaveBeenCalled();
  });
});
