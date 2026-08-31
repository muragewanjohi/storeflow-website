/**
 * POS sale creation — shared core used by POST /api/v1/mobile/pos/sales
 * (and, later, an online-only /dashboard/pos web route).
 *
 * Design: storeflow/docs/POS_OFFLINE_DESIGN.md §6.2
 *
 * Trust model matches src/app/api/checkout/route.ts: the client is trusted for
 * line prices and quantities; the server owns identifiers, tax, COGS, and stock.
 * POS sales are idempotent on (tenant_id, client_sale_id) and are created as
 * status = 'completed' (goods handed over at the counter).
 */

import { prisma } from '@/lib/prisma/client';
import type { Tenant } from '@/lib/tenant-context';
import { generateOrderNumber } from '@/lib/orders/utils';
import { generateInvoiceNumber } from '@/lib/invoices/generate-invoice-number';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';
import { getStaticOptions } from '@/lib/settings/static-options';
import { canCreateOrder } from '@/lib/subscriptions/limits';
import { checkIsDemoStore } from '@/lib/demo-store/restrictions';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { normalizeKenyaMsisdnForTumizi } from '@/lib/tumizi/phone';
import { initiateTumiziCustomerPaymentForOrder } from '@/lib/tumizi/initiate-order-payment';
import type { PosSaleInput } from '@/lib/pos/validation';

export class PosSaleError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'CONFLICT'
      | 'BAD_REQUEST' = 'VALIDATION_ERROR',
  ) {
    super(message);
    this.name = 'PosSaleError';
  }
}

export interface PosSaleResult {
  id: string;
  order_number: string;
  invoice_number: string | null;
  receipt_number: string;
  client_sale_id: string;
  subtotal: number;
  discount_total: number;
  tax_amount: number;
  total: number;
  amount_tendered: number | null;
  change_due: number | null;
  payment_status: string;
  status: string;
  /** Lines whose recorded stock was below the sold quantity at sale time. */
  oversold: Array<{ product_id: string; variant_id: string | null; name: string; available: number; sold: number }>;
  /** True when the tenant is at/over its plan order limit. Advisory only — the sale still succeeded. */
  over_limit: boolean;
  created_at: Date | null;
  /** True when this exact client_sale_id already existed (idempotent replay). */
  deduplicated: boolean;
  /**
   * True for M-Pesa sales: the STK push has been sent and the order is
   * `pending` — the caller must poll `.../tumizi/sync-payment` (or wait for the
   * webhook) until `payment_status` becomes `paid`.
   */
  requires_payment_confirmation: boolean;
  /** Tumizi external reference for the STK push, when `requires_payment_confirmation`. */
  tumizi_external_reference: string | null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function serializeExisting(order: {
  id: string;
  order_number: string;
  invoice_number: string | null;
  client_sale_id: string | null;
  total_amount: unknown;
  amount_tendered: unknown;
  change_due: unknown;
  payment_status: string | null;
  status: string | null;
  created_at: Date | null;
}, receiptNumber: string): PosSaleResult {
  const total = Number(order.total_amount);
  return {
    id: order.id,
    order_number: order.order_number,
    invoice_number: order.invoice_number,
    receipt_number: receiptNumber,
    client_sale_id: order.client_sale_id ?? '',
    subtotal: total,
    discount_total: 0,
    tax_amount: 0,
    total,
    amount_tendered: order.amount_tendered != null ? Number(order.amount_tendered) : null,
    change_due: order.change_due != null ? Number(order.change_due) : null,
    payment_status: order.payment_status ?? 'paid',
    status: order.status ?? 'completed',
    oversold: [],
    over_limit: false,
    created_at: order.created_at,
    deduplicated: true,
    requires_payment_confirmation: (order.payment_status ?? 'paid') === 'pending',
    tumizi_external_reference: null,
  };
}

export async function createPosSale(
  tenant: Tenant,
  servedByUserId: string,
  input: PosSaleInput,
): Promise<PosSaleResult> {
  // 1. Idempotency — a re-POST of the same client_sale_id is a no-op.
  const existing = await prisma.orders.findFirst({
    where: { tenant_id: tenant.id, client_sale_id: input.client_sale_id },
    select: {
      id: true,
      order_number: true,
      invoice_number: true,
      client_sale_id: true,
      total_amount: true,
      amount_tendered: true,
      change_due: true,
      payment_status: true,
      status: true,
      created_at: true,
    },
  });
  if (existing) {
    return serializeExisting(existing, input.receipt_number);
  }

  // 2. Demo stores cannot ring real sales.
  if (await checkIsDemoStore(tenant.id)) {
    throw new PosSaleError('POS sales are not available on demo stores', 403, 'FORBIDDEN');
  }

  // 3. Resolve and validate every line against tenant-owned products/variants.
  const productIds = Array.from(new Set(input.items.map((i) => i.product_id)));
  const variantIds = Array.from(
    new Set(input.items.map((i) => i.variant_id).filter((v): v is string => !!v)),
  );

  const [products, variants] = await Promise.all([
    prisma.products.findMany({
      where: { id: { in: productIds }, tenant_id: tenant.id },
      select: { id: true, name: true, cost_price: true, stock_quantity: true, metadata: true },
    }),
    variantIds.length
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds }, tenant_id: tenant.id },
          select: { id: true, product_id: true, cost_price: true, stock_quantity: true },
        })
      : Promise.resolve([] as Array<{ id: string; product_id: string; cost_price: unknown; stock_quantity: number | null }>),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const lines: Array<{
    product_id: string;
    variant_id: string | null;
    quantity: number;
    price: number;
    discount_amount: number;
    unit_cost_at_sale: number;
    cogs_total: number;
    total: number;
  }> = [];
  const oversold: PosSaleResult['oversold'] = [];

  let grossSubtotal = 0;
  let lineDiscountTotal = 0;

  for (const item of input.items) {
    const product = productById.get(item.product_id);
    if (!product) {
      throw new PosSaleError(`Product ${item.product_id} not found`, 404, 'NOT_FOUND');
    }

    const metadata = (product.metadata ?? {}) as Record<string, unknown>;
    const isDemoProduct =
      metadata.is_demo === true ||
      metadata.is_demo === 'true' ||
      metadata.source === 'starter_pack_ai';
    if (isDemoProduct) {
      throw new PosSaleError(`${product.name} is a demo product and cannot be sold`, 400);
    }

    let unitCost = product.cost_price != null ? Number(product.cost_price) : 0;
    let stock: number | null = product.stock_quantity;

    if (item.variant_id) {
      const variant = variantById.get(item.variant_id);
      if (!variant || variant.product_id !== item.product_id) {
        throw new PosSaleError(`Variant ${item.variant_id} not found`, 404, 'NOT_FOUND');
      }
      if (variant.cost_price != null) unitCost = Number(variant.cost_price);
      stock = variant.stock_quantity;
    }

    const lineGross = round2(item.unit_price * item.quantity);
    const lineDiscount = Math.min(round2(item.discount_amount), lineGross);
    const lineTotal = round2(lineGross - lineDiscount);

    grossSubtotal += lineGross;
    lineDiscountTotal += lineDiscount;

    if (stock !== null && stock < item.quantity) {
      oversold.push({
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        name: product.name,
        available: stock,
        sold: item.quantity,
      });
    }

    lines.push({
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      price: item.unit_price,
      discount_amount: lineDiscount,
      unit_cost_at_sale: unitCost,
      cogs_total: round2(unitCost * item.quantity),
      total: lineTotal,
    });
  }

  // 4. Order-level discount + tax (ported from checkout/route.ts:340-377, no delivery).
  const orderDiscount = Math.min(
    round2(input.order_discount_amount),
    round2(grossSubtotal - lineDiscountTotal),
  );
  const discountTotal = round2(lineDiscountTotal + orderDiscount);
  const subtotal = round2(grossSubtotal - discountTotal);

  const taxSettings = await getStaticOptions(tenant.id, [
    'tax_enabled',
    'default_tax_rate',
    'tax_pricing_type',
    'tax_included_in_price',
  ]);
  const taxEnabled = taxSettings.tax_enabled === 'true';
  const taxRate = taxSettings.default_tax_rate ? parseFloat(taxSettings.default_tax_rate) : null;
  const taxPricingType =
    taxSettings.tax_pricing_type ||
    (taxSettings.tax_included_in_price === 'true' ? 'inclusive' : 'exclusive');

  let taxAmount = 0;
  if (taxEnabled && taxRate) {
    const r = taxRate / 100;
    taxAmount =
      taxPricingType === 'inclusive'
        ? subtotal - subtotal / (1 + r)
        : subtotal * r;
    taxAmount = round2(taxAmount);
  }

  let total = subtotal;
  if (taxEnabled && taxRate && taxPricingType === 'exclusive') {
    total = round2(total + taxAmount);
  }

  const amountTendered = input.payment.amount_tendered != null ? round2(input.payment.amount_tendered) : null;
  const changeDue =
    amountTendered != null && amountTendered > total ? round2(amountTendered - total) : amountTendered != null ? 0 : null;

  // 5. Identifiers.
  let orderNumber = generateOrderNumber();
  while (await prisma.orders.findUnique({ where: { order_number: orderNumber }, select: { id: true } })) {
    orderNumber = generateOrderNumber();
  }
  const invoiceNumber = await generateInvoiceNumber(tenant.id);

  const customer = input.customer ?? { name: '', phone: '', email: '' };

  // 5b. M-Pesa (Tumizi customer STK). The order is created `pending` and the
  //     STK push is fired after the order + stock write; the webhook / sync
  //     poll promotes it to `paid`.
  const isMpesa = input.payment.method === 'mpesa';
  let mpesaPhone: string | null = null;
  if (isMpesa) {
    const tumiziConfig = await getTumiziTenantConfigByTenantId(tenant.id);
    if (!tumiziConfig?.enabled || !tumiziConfig.merchantExternalId) {
      throw new PosSaleError(
        'M-Pesa (Tumizi) is not set up for this store yet.',
        400,
        'BAD_REQUEST',
      );
    }
    mpesaPhone = normalizeKenyaMsisdnForTumizi(input.payment.phone_number ?? '');
    if (!mpesaPhone) {
      throw new PosSaleError(
        'Enter a valid Kenyan M-Pesa number (e.g. 07XX XXX XXX).',
        400,
        'VALIDATION_ERROR',
      );
    }
  }

  const paymentStatus = isMpesa ? 'pending' : input.payment.status;
  const paymentGateway = isMpesa ? 'tumizi' : input.payment.method;

  // 6. Create the order + lines. If a concurrent sync inserted the same
  //    client_sale_id between our step-1 check and now, the partial unique
  //    index (idx_orders_tenant_client_sale_id) rejects this with P2002 —
  //    treat that as an idempotent replay and return the winner.
  let order: { id: string; created_at: Date | null };
  try {
    order = await prisma.orders.create({
    data: {
      tenant_id: tenant.id,
      order_number: orderNumber,
      invoice_number: invoiceNumber,
      user_id: null,
      name: customer.name || null,
      email: customer.email || null,
      phone: customer.phone || null,
      total_amount: total,
      status: 'completed',
      payment_status: paymentStatus,
      payment_gateway: paymentGateway,
      transaction_id: isMpesa ? null : input.payment.reference || null,
      channel: 'pos',
      client_sale_id: input.client_sale_id,
      served_by: servedByUserId,
      pos_device_label: input.pos_device_label || null,
      amount_tendered: amountTendered,
      change_due: changeDue,
      offline_created_at: input.offline_created_at ? new Date(input.offline_created_at) : null,
      checkout_type: 'pos',
      delivery_fee: null,
      delivery_fee_status: null,
      coupon_discounted: discountTotal > 0 ? discountTotal : null,
      message: input.notes || null,
      order_products: {
        create: lines.map((l) => ({
          tenant_id: tenant.id,
          product_id: l.product_id,
          variant_id: l.variant_id,
          user_id: null,
          quantity: l.quantity,
          price: l.price,
          discount_amount: l.discount_amount,
          unit_cost_at_sale: l.unit_cost_at_sale,
          cogs_total: l.cogs_total,
          total: l.total,
        })),
      },
    },
    select: { id: true, created_at: true },
    });
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      const winner = await prisma.orders.findFirst({
        where: { tenant_id: tenant.id, client_sale_id: input.client_sale_id },
        select: {
          id: true,
          order_number: true,
          invoice_number: true,
          client_sale_id: true,
          total_amount: true,
          amount_tendered: true,
          change_due: true,
          payment_status: true,
          status: true,
          created_at: true,
        },
      });
      if (winner) return serializeExisting(winner, input.receipt_number);
    }
    throw err;
  }

  // 7. Decrement stock (ported from checkout:461-495).
  const productsWithVariants = new Set<string>();
  for (const l of lines) {
    if (l.variant_id) {
      await prisma.product_variants.update({
        where: { id: l.variant_id },
        data: { stock_quantity: { decrement: l.quantity } },
      });
      productsWithVariants.add(l.product_id);
    } else {
      await prisma.products.update({
        where: { id: l.product_id },
        data: { stock_quantity: { decrement: l.quantity } },
      });
    }
  }
  for (const productId of productsWithVariants) {
    await syncProductStockFromVariants(productId, tenant.id);
  }

  // 7b. M-Pesa: fire the Tumizi STK push. On failure, undo the stock decrement
  //     and delete the order (mirrors rollbackCheckoutAfterFailedTumizi) — no
  //     inventory_history has been written yet, so nothing to unwind there.
  let tumiziExternalReference: string | null = null;
  if (isMpesa && mpesaPhone) {
    try {
      const { externalReference } = await initiateTumiziCustomerPaymentForOrder({
        tenantId: tenant.id,
        tenantName: tenant.name,
        order: {
          id: order.id,
          order_number: orderNumber,
          invoice_number: invoiceNumber,
          total_amount: total,
          name: customer.name || null,
          email: customer.email || null,
        },
        phoneNumber: mpesaPhone,
        userId: servedByUserId,
        narration: `POS sale ${input.receipt_number}`,
      });
      tumiziExternalReference = externalReference;
    } catch (tumiziError) {
      for (const l of lines) {
        if (l.variant_id) {
          await prisma.product_variants.update({
            where: { id: l.variant_id },
            data: { stock_quantity: { increment: l.quantity } },
          });
        } else {
          await prisma.products.update({
            where: { id: l.product_id },
            data: { stock_quantity: { increment: l.quantity } },
          });
        }
      }
      for (const productId of productsWithVariants) {
        await syncProductStockFromVariants(productId, tenant.id);
      }
      await prisma.orders
        .delete({ where: { id: order.id, tenant_id: tenant.id } })
        .catch(() => undefined);

      const message =
        tumiziError instanceof Error
          ? tumiziError.message
          : 'Could not start the M-Pesa payment. Try again or take cash.';
      throw new PosSaleError(message, 502, 'BAD_REQUEST');
    }
  }

  // 8. Inventory audit rows (checkout omits these for online orders; POS keeps
  //    them). Written only once the sale is committed — i.e. after a successful
  //    STK push for M-Pesa.
  for (const l of lines) {
    const before = l.variant_id
      ? variantById.get(l.variant_id)?.stock_quantity ?? null
      : productById.get(l.product_id)?.stock_quantity ?? null;
    await prisma.inventory_history.create({
      data: {
        tenant_id: tenant.id,
        product_id: l.variant_id ? null : l.product_id,
        variant_id: l.variant_id,
        adjustment_type: 'sale',
        quantity_before: before ?? 0,
        quantity_after: (before ?? 0) - l.quantity,
        quantity_change: -l.quantity,
        reason: 'pos_sale',
        notes: orderNumber,
        adjusted_by: servedByUserId,
      },
    });
  }

  // 9. Plan limit — advisory only, never blocks a completed sale.
  const limitCheck = await canCreateOrder(tenant);

  return {
    id: order.id,
    order_number: orderNumber,
    invoice_number: invoiceNumber,
    receipt_number: input.receipt_number,
    client_sale_id: input.client_sale_id,
    subtotal,
    discount_total: discountTotal,
    tax_amount: taxAmount,
    total,
    amount_tendered: amountTendered,
    change_due: changeDue,
    payment_status: paymentStatus,
    status: 'completed',
    oversold,
    over_limit: !limitCheck.allowed,
    created_at: order.created_at,
    deduplicated: false,
    requires_payment_confirmation: isMpesa,
    tumizi_external_reference: tumiziExternalReference,
  };
}
