-- Basic services support — see docs/SERVICES_PLAN.md, tracker rows
-- S1.1-S1.6. Borrows Shopify's own real design for this (researched
-- directly, see the plan doc's "What Shopify actually does" section): a
-- service is just a product with shipping turned off, not a separate
-- entity/table.
--
-- Additive, fully backward-compatible: defaults to true, so every
-- existing product row keeps its current (correct) meaning — it ships,
-- exactly as it always has. Deliberately a plain boolean, not a
-- type: 'product' | 'service' enum — a requires_shipping: false row
-- already fully describes "a service, a voucher, a digital item, anything
-- that doesn't ship," and stays forward-compatible with digital products
-- without another migration later.

ALTER TABLE public.products
  ADD COLUMN requires_shipping boolean NOT NULL DEFAULT true;
