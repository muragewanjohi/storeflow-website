'use client';

/**
 * Web dashboard Point of Sale.
 *
 * Left: catalogue search + grid. Right: cart, discounts, customer, totals.
 * "Charge" opens the payment dialog (cash / M-Pesa STK via Tumizi / other);
 * on success a printable receipt is shown. Totals math mirrors the server
 * (@/lib/pos/create-sale) so the counter figure always matches the order.
 */

import { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrency } from '@/lib/currency/currency-context';
import type {
  PosBootstrapPayload,
  PosBootstrapProduct as Product,
  PosBootstrapSettings as Settings,
  PosBootstrapVariant as Variant,
} from '@/lib/pos/bootstrap-types';

type Bootstrap = Pick<PosBootstrapPayload, 'captured_at' | 'products' | 'settings'>;

interface CartLine {
  key: string;
  product: Product;
  variant: Variant | null;
  quantity: number;
  discount: number;
}

type PaymentMethod = 'cash' | 'mpesa' | 'other';

interface SaleResult {
  id: string;
  order_number: string;
  invoice_number: string | null;
  receipt_number: string;
  subtotal: number;
  discount_total: number;
  tax_amount: number;
  total: number;
  amount_tendered: number | null;
  change_due: number | null;
  payment_status: string;
  oversold: { name: string; available: number; sold: number }[];
  over_limit: boolean;
  requires_payment_confirmation: boolean;
}

// ---------------------------------------------------------------------------
// Totals — port of create-sale.ts steps 3–4
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function unitPrice(line: CartLine): number {
  if (line.variant) return line.variant.price;
  return line.product.sale_price && line.product.sale_price > 0
    ? line.product.sale_price
    : line.product.price;
}

function lineGross(line: CartLine): number {
  return round2(unitPrice(line) * line.quantity);
}

function computeTotals(lines: CartLine[], orderDiscount: number, tax: Settings['tax']) {
  let gross = 0;
  let lineDiscount = 0;
  for (const l of lines) {
    const g = lineGross(l);
    gross += g;
    lineDiscount += Math.min(Math.max(l.discount, 0), g);
  }
  gross = round2(gross);
  lineDiscount = round2(lineDiscount);
  const orderDisc = Math.min(Math.max(orderDiscount, 0), round2(gross - lineDiscount));
  const discountTotal = round2(lineDiscount + orderDisc);
  const subtotal = round2(gross - discountTotal);

  let taxAmount = 0;
  if (tax.enabled && tax.rate && tax.rate > 0) {
    const r = tax.rate / 100;
    taxAmount = round2(
      tax.pricing_type === 'inclusive' ? subtotal - subtotal / (1 + r) : subtotal * r,
    );
  }
  let total = subtotal;
  if (tax.enabled && tax.rate && tax.pricing_type === 'exclusive') total = round2(total + taxAmount);

  return { gross, discountTotal, subtotal, taxAmount, total };
}

function variantLabel(v: Variant): string {
  return v.attributes.map((a) => a.value).filter(Boolean).join(' / ') || 'Variant';
}
function availableStock(line: CartLine): number | null {
  return line.variant ? line.variant.stock_quantity : line.product.stock_quantity;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PosClient({ initialBootstrap }: { initialBootstrap: Bootstrap }) {
  const { formatPrice } = useCurrency();
  const [bootstrap, setBootstrap] = useState(initialBootstrap);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [variantPickerFor, setVariantPickerFor] = useState<Product | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [completed, setCompleted] = useState<{ result: SaleResult; lines: CartLine[]; method: PaymentMethod } | null>(null);
  const [mpesaStatus, setMpesaStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [polling, setPolling] = useState(false);

  const settings = bootstrap.settings;
  const tax = settings.tax;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bootstrap.products;
    return bootstrap.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.variants.some(
          (v) =>
            v.sku?.toLowerCase().includes(q) ||
            v.barcode?.toLowerCase().includes(q) ||
            variantLabel(v).toLowerCase().includes(q),
        ),
    );
  }, [bootstrap.products, query]);

  const totals = useMemo(
    () => computeTotals(lines, orderDiscount, tax),
    [lines, orderDiscount, tax],
  );
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  // -- cart ops ------------------------------------------------------------

  function addItem(product: Product, variant: Variant | null) {
    setLines((prev) => {
      const i = prev.findIndex(
        (l) => l.product.id === product.id && l.variant?.id === variant?.id && l.discount === 0,
      );
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        { key: crypto.randomUUID(), product, variant, quantity: 1, discount: 0 },
      ];
    });
  }
  function onProductClick(product: Product) {
    if (product.has_variants && product.variants.length > 0) {
      setVariantPickerFor(product);
      return;
    }
    addItem(product, null);
  }
  const setQty = (key: string, q: number) =>
    setLines((prev) =>
      q <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: q } : l)),
    );
  const setLineDiscount = (key: string, d: number) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, discount: Math.max(0, d) } : l)));
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  function resetSale() {
    setLines([]);
    setOrderDiscount(0);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setTendered('');
    setMpesaPhone('');
    setMethod('cash');
    setCompleted(null);
    setMpesaStatus('pending');
  }

  async function refreshCatalogue() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/dashboard/pos/bootstrap', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Refresh failed');
      setBootstrap({ captured_at: data.captured_at, products: data.products, settings: data.settings });
      toast.success('Catalogue refreshed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not refresh');
    } finally {
      setRefreshing(false);
    }
  }

  // -- submit ------------------------------------------------------------

  async function submitSale() {
    if (lines.length === 0) return;
    const isMpesa = method === 'mpesa';
    const tenderedNum = method === 'cash' ? parseFloat(tendered) : NaN;

    if (method === 'cash' && !Number.isNaN(tenderedNum) && tenderedNum < totals.total) {
      toast.error('Cash received is less than the amount due.');
      return;
    }
    if (isMpesa && mpesaPhone.replace(/\D/g, '').length < 9) {
      toast.error('Enter a valid M-Pesa phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const receiptNumber = `POS-${new Date()
        .toISOString()
        .slice(2, 19)
        .replace(/[-:T]/g, '')
        .replace(/(\d{6})(\d{6})/, '$1-$2')}`;

      const body = {
        client_sale_id: crypto.randomUUID(),
        receipt_number: receiptNumber,
        offline_created_at: new Date().toISOString(),
        pos_device_label: 'Web dashboard',
        items: lines.map((l) => ({
          product_id: l.product.id,
          variant_id: l.variant?.id ?? null,
          quantity: l.quantity,
          unit_price: unitPrice(l),
          discount_amount: l.discount,
        })),
        order_discount_amount: orderDiscount,
        payment: {
          method,
          status: isMpesa ? 'pending' : 'paid',
          ...(method === 'cash' && !Number.isNaN(tenderedNum)
            ? { amount_tendered: tenderedNum }
            : {}),
          ...(isMpesa ? { phone_number: mpesaPhone.trim() } : {}),
        },
        ...(customerName || customerPhone
          ? { customer: { name: customerName, phone: customerPhone } }
          : {}),
        ...(notes ? { notes } : {}),
      };

      const res = await fetch('/api/dashboard/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'The sale could not be recorded.');

      const result: SaleResult = data.sale;
      const snapshot = { result, lines: [...lines], method };
      setPayOpen(false);
      setCompleted(snapshot);

      if (result.oversold.length) {
        toast.warning(
          `Stock went below zero for ${result.oversold.map((o) => o.name).join(', ')}.`,
        );
      }

      if (isMpesa && result.requires_payment_confirmation && result.payment_status !== 'paid') {
        setMpesaStatus('pending');
        pollMpesa(result.id);
      } else {
        toast.success('Sale recorded');
      }
      // Cart is safe to clear — the order exists server-side now.
      setLines([]);
      setOrderDiscount(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function pollMpesa(orderId: string, attempt = 0) {
    if (attempt >= 24) {
      setPolling(false);
      return;
    }
    setPolling(true);
    try {
      const res = await fetch(`/api/dashboard/pos/sales/${orderId}/status`, { cache: 'no-store' });
      const data = await res.json();
      const status: string = data.payment_status ?? 'pending';
      if (status === 'paid') {
        setMpesaStatus('paid');
        setPolling(false);
        setCompleted((c) =>
          c ? { ...c, result: { ...c.result, payment_status: 'paid' } } : c,
        );
        toast.success('M-Pesa payment confirmed');
        return;
      }
      if (status === 'failed' || status === 'cancelled') {
        setMpesaStatus('failed');
        setPolling(false);
        return;
      }
    } catch {
      /* transient — keep polling */
    }
    setTimeout(() => pollMpesa(orderId, attempt + 1), 5000);
  }

  // -- receipt view -----------------------------------------------------

  if (completed) {
    const r = completed.result;
    const paid = r.payment_status === 'paid';
    return (
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <style>{`@media print { body * { visibility: hidden } .pos-receipt, .pos-receipt * { visibility: visible } .pos-receipt { position: absolute; inset: 0; margin: 0; width: 100%; } .pos-no-print { display: none !important } }`}</style>

        <div className="pos-receipt rounded-xl border bg-white p-6">
          <div className="text-center">
            <h2 className="text-lg font-bold">{String(settings.store.name ?? 'Store')}</h2>
            {settings.store.address ? (
              <p className="text-sm text-gray-500">{String(settings.store.address)}</p>
            ) : null}
          </div>
          <div className="my-4 border-t border-dashed" />
          <dl className="space-y-1 text-sm">
            <Row k="Receipt" v={r.receipt_number} />
            <Row k="Order" v={r.order_number} />
            {r.invoice_number ? <Row k="Invoice" v={r.invoice_number} /> : null}
            <Row k="Date" v={new Date().toLocaleString()} />
            <Row k="Payment" v={methodLabel(completed.method)} />
            <Row k="Status" v={paid ? 'Paid' : 'Awaiting payment'} />
            {completed.method === 'cash' && customerName ? (
              <Row k="Customer" v={customerName} />
            ) : null}
          </dl>
          <div className="my-4 border-t border-dashed" />
          <div className="space-y-1 text-sm">
            {completed.lines.map((l) => (
              <div key={l.key} className="flex justify-between">
                <span>
                  {l.quantity} × {l.variant ? `${l.product.name} — ${variantLabel(l.variant)}` : l.product.name}
                </span>
                <span>{formatPrice(round2(lineGross(l) - Math.min(l.discount, lineGross(l))))}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-dashed" />
          <dl className="space-y-1 text-sm">
            <Row k="Subtotal" v={formatPrice(r.subtotal)} />
            {r.discount_total > 0 ? <Row k="Discount" v={`− ${formatPrice(r.discount_total)}`} /> : null}
            {r.tax_amount > 0 ? <Row k="Tax" v={formatPrice(r.tax_amount)} /> : null}
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd>{formatPrice(r.total)}</dd>
            </div>
            {r.amount_tendered != null ? <Row k="Cash" v={formatPrice(r.amount_tendered)} /> : null}
            {r.change_due != null && r.change_due > 0 ? (
              <Row k="Change" v={formatPrice(r.change_due)} />
            ) : null}
          </dl>
          <p className="mt-4 text-center text-xs text-gray-500">Thank you!</p>
        </div>

        {completed.method === 'mpesa' && !paid ? (
          <div className="pos-no-print mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            {mpesaStatus === 'failed' ? (
              <p>The M-Pesa request was declined or timed out — the sale is recorded as unpaid. It updates automatically if the customer completes it later; check the order in Orders.</p>
            ) : (
              <p className="flex items-center gap-2">
                {polling ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
                Waiting for the customer to approve the M-Pesa prompt on {mpesaPhone || 'their phone'}…
              </p>
            )}
          </div>
        ) : null}

        {r.over_limit ? (
          <p className="pos-no-print mt-3 text-sm text-amber-700">
            You&apos;ve reached your plan&apos;s order limit — the sale was still recorded. Consider upgrading.
          </p>
        ) : null}

        <div className="pos-no-print mt-6 flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="flex-1">
            <PrinterIcon className="mr-2 h-4 w-4" /> Print receipt
          </Button>
          <Button onClick={resetSale} className="flex-1">New sale</Button>
        </div>
      </div>
    );
  }

  // -- main POS view ---------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Catalogue */}
      <div className="flex min-h-0 flex-1 flex-col border-b lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU or barcode…"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshCatalogue}
            disabled={refreshing}
            title="Refresh catalogue"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
          {filtered.length === 0 ? (
            <p className="mt-16 text-center text-sm text-gray-500">
              {query ? 'No products match that search' : 'No products in your catalogue yet'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const out = p.stock_quantity != null && p.stock_quantity <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => onProductClick(p)}
                    className="flex flex-col rounded-lg border p-3 text-left transition hover:border-blue-500 hover:shadow-sm"
                  >
                    <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                    <span className="mt-1 text-sm text-gray-600">
                      {formatPrice(p.sale_price && p.sale_price > 0 ? p.sale_price : p.price)}
                    </span>
                    <span className="mt-1 text-xs text-gray-400">
                      {p.has_variants
                        ? 'Choose variant'
                        : out
                          ? 'Out of stock'
                          : p.stock_quantity != null
                            ? `${p.stock_quantity} in stock`
                            : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="flex w-full flex-col lg:w-[420px]">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">Point of Sale</h1>
          {lines.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={resetSale}>Clear</Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {lines.length === 0 ? (
            <p className="mt-16 text-center text-sm text-gray-500">
              Tap a product to start a sale
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((l) => {
                const stock = availableStock(l);
                const over = stock != null && l.quantity > stock;
                return (
                  <div key={l.key} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {l.variant ? `${l.product.name} — ${variantLabel(l.variant)}` : l.product.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatPrice(unitPrice(l))} each</p>
                        {over ? (
                          <p className="text-xs font-semibold text-red-600">Only {stock} in stock</p>
                        ) : null}
                      </div>
                      <button onClick={() => removeLine(l.key)} className="text-gray-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <button className="px-2 py-1" onClick={() => setQty(l.key, l.quantity - 1)}>
                          <MinusIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{l.quantity}</span>
                        <button className="px-2 py-1" onClick={() => setQty(l.key, l.quantity + 1)}>
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400">Disc.</span>
                        <Input
                          type="number"
                          value={l.discount || ''}
                          onChange={(e) => setLineDiscount(l.key, parseFloat(e.target.value) || 0)}
                          className="h-7 w-20"
                        />
                      </div>
                      <span className="text-sm font-semibold">
                        {formatPrice(round2(lineGross(l) - Math.min(l.discount, lineGross(l))))}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="text-gray-500">Order discount</span>
                <Input
                  type="number"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                  className="h-7 w-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  placeholder="Customer phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <Input placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
        </div>

        {lines.length > 0 ? (
          <div className="border-t p-4">
            <dl className="mb-3 space-y-1 text-sm">
              <Row k="Subtotal" v={formatPrice(totals.gross)} />
              {totals.discountTotal > 0 ? <Row k="Discount" v={`− ${formatPrice(totals.discountTotal)}`} /> : null}
              {totals.taxAmount > 0 ? <Row k="Tax" v={formatPrice(totals.taxAmount)} /> : null}
              <div className="flex justify-between text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(totals.total)}</dd>
              </div>
            </dl>
            <Button className="w-full" size="lg" onClick={() => setPayOpen(true)}>
              Charge {formatPrice(totals.total)} · {itemCount} item{itemCount === 1 ? '' : 's'}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Variant picker */}
      <Dialog open={!!variantPickerFor} onOpenChange={(o) => !o && setVariantPickerFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{variantPickerFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {variantPickerFor?.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  addItem(variantPickerFor, v);
                  setVariantPickerFor(null);
                }}
                className="flex w-full items-center justify-between rounded-md border p-3 text-sm hover:border-blue-500"
              >
                <span>
                  {variantLabel(v)}
                  <span className="ml-2 text-xs text-gray-400">
                    {v.stock_quantity == null
                      ? ''
                      : v.stock_quantity <= 0
                        ? 'Out of stock'
                        : `${v.stock_quantity} in stock`}
                  </span>
                </span>
                <span className="font-semibold">{formatPrice(v.price)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment · {formatPrice(totals.total)}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            {settings.payments.cash_enabled ? (
              <MethodBtn active={method === 'cash'} onClick={() => setMethod('cash')}>Cash</MethodBtn>
            ) : null}
            {settings.payments.mpesa_stk_enabled ? (
              <MethodBtn active={method === 'mpesa'} onClick={() => setMethod('mpesa')}>M-Pesa</MethodBtn>
            ) : null}
            <MethodBtn active={method === 'other'} onClick={() => setMethod('other')}>Other</MethodBtn>
          </div>

          {method === 'cash' ? (
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Cash received (optional)</label>
              <Input
                type="number"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder="0"
              />
              {tendered && parseFloat(tendered) >= totals.total ? (
                <p className="text-sm font-semibold text-green-700">
                  Change due: {formatPrice(round2(parseFloat(tendered) - totals.total))}
                </p>
              ) : null}
            </div>
          ) : method === 'mpesa' ? (
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Customer M-Pesa number</label>
              <Input
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XX XXX XXX"
              />
              <p className="text-xs text-gray-500">
                An STK push is sent to this number. The sale is recorded now and marked paid once the
                customer approves it.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Records the sale as paid without an electronic transaction — use this when the customer
              has already paid (e.g. to your own M-Pesa till).
            </p>
          )}

          <Button className="w-full" size="lg" disabled={submitting} onClick={submitSale}>
            {submitting
              ? 'Processing…'
              : method === 'mpesa'
                ? `Send M-Pesa request · ${formatPrice(totals.total)}`
                : `Complete sale · ${formatPrice(totals.total)}`}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function MethodBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
        active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  );
}

function methodLabel(m: PaymentMethod): string {
  return m === 'cash' ? 'Cash' : m === 'mpesa' ? 'M-Pesa (STK)' : 'Already paid / other';
}
