-- Real scheduling/booking — see docs/SERVICES_PLAN.md ("Why booking is a
-- separate phase") and IMPLEMENTATION_TRACKER.md row S2. Built speculatively
-- (no confirmed merchant demand yet), on top of the already-shipped
-- requires_shipping (S1) and deposit (S-Dep) support.
--
-- Capacity, not named staff (user-confirmed scope): a bookable product
-- gets a `booking_capacity` (default 1, "how many concurrent bookings this
-- service supports", e.g. 3 chairs) for conflict prevention. A booking may
-- carry a free-text `staff_label` the merchant fills in when managing it —
-- cosmetic only. Staff live in Supabase Auth, not a Prisma-modeled table
-- (confirmed: no `users`/`staff` model in prisma/schema.prisma); a raw
-- unlabeled uuid with no FK is the existing precedent for this
-- (orders.served_by, POS staff attribution) — service_bookings doesn't
-- even need the raw uuid for v1, since staff assignment is cosmetic only.

ALTER TABLE public.products
  ADD COLUMN is_bookable boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_duration_minutes integer,
  ADD COLUMN booking_capacity integer NOT NULL DEFAULT 1;

CREATE TABLE public.service_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id          uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_product_id  uuid REFERENCES public.order_products(id) ON DELETE SET NULL,
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,
  customer_name     varchar(255),
  customer_phone    varchar(50),
  customer_email    varchar(255),
  booking_date      date NOT NULL,
  start_time        time NOT NULL,
  end_time          time NOT NULL,
  staff_label       varchar(100), -- free text, cosmetic only — see note above
  status            varchar(20) NOT NULL DEFAULT 'pending', -- pending|confirmed|completed|cancelled|no_show
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_service_bookings_tenant_date ON public.service_bookings (tenant_id, booking_date);
CREATE INDEX idx_service_bookings_tenant_status ON public.service_bookings (tenant_id, status);
CREATE INDEX idx_service_bookings_order_id ON public.service_bookings (order_id);
CREATE INDEX idx_service_bookings_product_date ON public.service_bookings (product_id, booking_date);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

-- Initplan-safe form from the start (select wrapping current_setting()) —
-- see 20260817180000_fix_rls_auth_initplan_performance.sql, which had to
-- retrofit 55 other policies out of the bare form. No point creating new
-- debt we already know about, same discipline ai_usage_log's own creation
-- migration already followed.
CREATE POLICY "service_bookings_tenant_isolation" ON public.service_bookings
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);
