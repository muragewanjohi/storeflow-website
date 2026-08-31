-- Basic deposit/partial-payment support — see docs/SERVICES_PLAN.md's
-- "Deposits / Partial Payments" section, tracker rows S-Dep.1-S-Dep.7.
--
-- Requested directly by the user, prompted by services often requiring a
-- deposit ("some services require a deposit to be made, confirm that we
-- have that payment option?"). Confirmed we had none before building this.
--
-- Two additive, fully backward-compatible changes:
--
-- 1. `products.deposit_type`/`deposit_value` — where a merchant configures
--    a deposit, per item (mirrors requires_shipping's own per-item design,
--    not a whole-tenant flag). deposit_type defaults to 'none' so every
--    existing product row is unaffected; deposit_value is only meaningful
--    when deposit_type != 'none' (a KES amount for 'fixed', a 0-100 number
--    for 'percentage').
--
-- 2. `orders.deposit_amount`/`balance_amount` — NULL for every normal
--    (non-deposit) order, so total_amount keeps its existing meaning (the
--    full order value) unconditionally and every existing reader of it
--    (invoices, emails, dashboards, all 15+ analytics revenue queries)
--    needs zero changes. Only set when a deposit was actually charged:
--    deposit_amount is the amount charged now, balance_amount is
--    total_amount - deposit_amount.
--
-- payment_status itself needs no schema change — it's already a free-text
-- varchar (see orders.payment_status), so the new 'deposit_paid' value is
-- purely an application-level convention, same as how 'pending'/'paid'/
-- 'refunded' already work. It's a value DISTINCT from 'paid' by design —
-- every existing `payment_status = 'paid'` analytics/revenue query
-- continues to work correctly unchanged, since a deposit-only order
-- correctly does not count as full revenue until the balance is collected.

ALTER TABLE public.products
  ADD COLUMN deposit_type varchar(20) NOT NULL DEFAULT 'none',
  ADD COLUMN deposit_value numeric(10,2);

ALTER TABLE public.orders
  ADD COLUMN deposit_amount numeric(10,2),
  ADD COLUMN balance_amount numeric(10,2);
