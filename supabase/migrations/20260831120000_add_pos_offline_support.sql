-- Offline-first POS support
-- Design: storeflow/docs/POS_OFFLINE_DESIGN.md
--
-- Adds:
--   orders.channel            - 'online' (default, all existing rows) | 'pos'
--   orders.client_sale_id     - client-generated idempotency key for POS sales
--   orders.served_by          - staff/owner (auth user id) who rang the sale; no FK
--                               (matches orders.user_id / inventory_history.adjusted_by convention)
--   orders.pos_device_label   - human label of the till/device
--   orders.amount_tendered    - cash given by the customer
--   orders.change_due         - change handed back
--   orders.offline_created_at - real wall-clock time the sale happened when offline
--   order_products.discount_amount - ad-hoc per-line discount (POS; checkout coupons still TODO)
--   products.barcode          - scan-to-add lookup (only sku existed before)

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS channel            varchar(20)  NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS client_sale_id     uuid,
  ADD COLUMN IF NOT EXISTS served_by          uuid,
  ADD COLUMN IF NOT EXISTS pos_device_label   varchar(100),
  ADD COLUMN IF NOT EXISTS amount_tendered    numeric(10,2),
  ADD COLUMN IF NOT EXISTS change_due         numeric(10,2),
  ADD COLUMN IF NOT EXISTS offline_created_at timestamptz;

-- One POS sale per (tenant, client_sale_id): makes offline retries a safe no-op.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tenant_client_sale_id
  ON public.orders (tenant_id, client_sale_id)
  WHERE client_sale_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_tenant_channel
  ON public.orders (tenant_id, channel);

ALTER TABLE public.order_products
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode varchar(100);

CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode
  ON public.products (tenant_id, barcode)
  WHERE barcode IS NOT NULL;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS barcode varchar(100);

CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_barcode
  ON public.product_variants (tenant_id, barcode)
  WHERE barcode IS NOT NULL;

COMMENT ON COLUMN public.orders.channel IS 'Sales channel: online (storefront/checkout) or pos (in-person counter sale)';
COMMENT ON COLUMN public.orders.client_sale_id IS 'POS: client-generated UUID, idempotency key for offline sale sync';
COMMENT ON COLUMN public.orders.served_by IS 'POS: auth user id of the staff/owner who rang the sale (no FK, matches user_id convention)';
COMMENT ON COLUMN public.orders.offline_created_at IS 'POS: real wall-clock sale time captured on-device when created offline';
COMMENT ON COLUMN public.order_products.discount_amount IS 'Ad-hoc discount applied to this line (currency amount, not percentage)';
COMMENT ON COLUMN public.products.barcode IS 'Barcode/UPC/EAN for POS scan-to-add lookup';
COMMENT ON COLUMN public.product_variants.barcode IS 'Barcode/UPC/EAN for POS scan-to-add lookup (variant-level)';

COMMIT;
