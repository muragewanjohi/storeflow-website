/**
 * Wiring tests for the web dashboard POS routes — cookie-auth gating,
 * validation, and response shaping. Sale math is covered by
 * src/lib/pos/__tests__/create-sale.test.ts.
 */

import { NextResponse } from 'next/server';
import { POST as salesPOST } from '../sales/route';
import { GET as bootstrapGET } from '../bootstrap/route';
import { requirePosDashboardStaff } from '@/lib/pos/dashboard-auth';
import { createPosSale, PosSaleError } from '@/lib/pos/create-sale';
import { loadPosBootstrap } from '@/lib/pos/load-bootstrap';

jest.mock('@/lib/pos/dashboard-auth', () => ({
  requirePosDashboardStaff: jest.fn(),
}));

jest.mock('@/lib/pos/create-sale', () => {
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

jest.mock('@/lib/pos/load-bootstrap', () => ({
  loadPosBootstrap: jest.fn(),
}));

const mockGate = requirePosDashboardStaff as jest.Mock;
const mockCreate = createPosSale as jest.Mock;
const mockLoad = loadPosBootstrap as jest.Mock;

const TENANT = { id: 'tenant-1', name: 'Test Store' };
const OK_GATE = { ok: true, user: { id: 'user-1' }, tenant: TENANT };

const VALID_BODY = {
  client_sale_id: '33333333-3333-4333-8333-333333333333',
  receipt_number: 'POS-250101-120000',
  items: [
    {
      product_id: '11111111-1111-4111-8111-111111111111',
      variant_id: null,
      quantity: 1,
      unit_price: 500,
    },
  ],
  payment: { method: 'cash' },
};

function req(body: unknown, url = 'http://localhost/api/dashboard/pos/sales') {
  return { url, json: async () => body } as unknown as Parameters<typeof salesPOST>[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGate.mockResolvedValue(OK_GATE);
});

describe('POST /api/dashboard/pos/sales', () => {
  it('returns the auth gate response when unauthorised', async () => {
    mockGate.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 with issues on an invalid payload', async () => {
    const res = await salesPOST(req({ items: [] }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(Array.isArray(json.issues)).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('records a sale and returns 201', async () => {
    mockCreate.mockResolvedValue({ id: 'o1', order_number: 'ORD-1', total: 500, deduplicated: false });
    const res = await salesPOST(req(VALID_BODY));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.sale.order_number).toBe('ORD-1');
    expect(mockCreate).toHaveBeenCalledWith(
      TENANT,
      'user-1',
      expect.objectContaining({ client_sale_id: VALID_BODY.client_sale_id }),
    );
  });

  it('returns 200 for an idempotent replay', async () => {
    mockCreate.mockResolvedValue({ id: 'o1', order_number: 'ORD-1', deduplicated: true });
    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(200);
  });

  it('maps a PosSaleError to its status', async () => {
    mockCreate.mockRejectedValue(new PosSaleError('demo store', 403, 'FORBIDDEN'));
    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it('returns 500 on an unexpected error', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));
    const res = await salesPOST(req(VALID_BODY));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/dashboard/pos/bootstrap', () => {
  it('gates on auth', async () => {
    mockGate.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const res = await bootstrapGET(req(null, 'http://localhost/api/dashboard/pos/bootstrap'));
    expect(res.status).toBe(403);
  });

  it('returns the payload with success:true', async () => {
    mockLoad.mockResolvedValue({
      captured_at: '2026-01-01T00:00:00Z',
      delta: false,
      product_count: 2,
      products: [],
      settings: { payments: { mpesa_stk_enabled: true } },
    });
    const res = await bootstrapGET(req(null, 'http://localhost/api/dashboard/pos/bootstrap?since=x'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.product_count).toBe(2);
    expect(mockLoad).toHaveBeenCalledWith(TENANT, { since: 'x' });
  });
});
