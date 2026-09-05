/**
 * Live smoke test for basic deposit/partial-payment support
 * (docs/SERVICES_PLAN.md's "Deposits / Partial Payments" section, tracker
 * rows S-Dep.1-S-Dep.4).
 *
 * No live checkout/STK-push side effects here deliberately — creating a
 * real order and triggering a real Tumizi charge is a bigger action than
 * this pass's own scope covers, matching the honest verification ceiling
 * already applied to every other payment-adjacent change this session.
 * Instead, this exercises the REAL exported pure-calculation and
 * status-resolution functions the live checkout route and Tumizi webhook
 * actually call — not reimplemented copies.
 *
 * Part 1: computeLineDepositDue / computeOrderDeposit
 *   (@/lib/orders/deposit — the exact functions checkout/route.ts imports).
 * Part 2: resolveTumiziOrderPaymentStatus / shouldSkipTumiziOrderPaymentDowngrade
 *   (@/lib/tumizi/apply-payment-status — the exact functions the real
 *   Tumizi webhook handler imports).
 *
 * Usage: npm run test:deposit-support
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { computeLineDepositDue, computeOrderDeposit } = await import('../src/lib/orders/deposit');
  const {
    resolveTumiziOrderPaymentStatus,
    shouldSkipTumiziOrderPaymentDowngrade,
  } = await import('../src/lib/tumizi/apply-payment-status');

  let passed = 0;
  let total = 0;
  function check(label: string, condition: boolean, detail?: unknown) {
    total++;
    if (condition) {
      passed++;
      console.log(`PASS: ${label}`);
    } else {
      console.log(`FAIL: ${label}`, detail ?? '');
    }
  }

  console.log('--- Part 1: computeLineDepositDue ---');
  check('no deposit configured -> full item total', computeLineDepositDue(1000, 'none', null) === 1000);
  check('percentage deposit -> exact fraction', computeLineDepositDue(1000, 'percentage', 20) === 200);
  check('fixed deposit under item total -> the fixed value', computeLineDepositDue(1000, 'fixed', 300) === 300);
  check(
    'fixed deposit exceeding item total -> capped at item total (never more than what the line owes)',
    computeLineDepositDue(1000, 'fixed', 5000) === 1000,
  );
  check('null deposit_value with a type set -> falls back to full item total', computeLineDepositDue(1000, 'percentage', null) === 1000);

  console.log('\n--- Part 2: computeOrderDeposit ---');
  const noDeposit = computeOrderDeposit({
    itemsSubtotal: 2000,
    depositSubtotal: 2000, // every line contributed its full price -> no deposit involved
    taxAmount: 0,
    deliveryFee: 200,
    finalTotal: 2200,
  });
  check(
    'no deposit involved -> both fields null (total_amount keeps its existing, unconditional meaning)',
    noDeposit.depositAmount === null && noDeposit.balanceAmount === null,
    noDeposit,
  );

  // A KES 2000 haircut with a 30% (600) deposit, KES 100 delivery, no tax.
  const withDeposit = computeOrderDeposit({
    itemsSubtotal: 2000,
    depositSubtotal: 600,
    taxAmount: 0,
    deliveryFee: 100,
    finalTotal: 2100,
  });
  check(
    'deposit charged now includes tax/delivery, not just the item-price fraction',
    withDeposit.depositAmount === 700, // 600 deposit + 100 delivery
    withDeposit,
  );
  check(
    'balance is exactly the withheld item-price portion',
    withDeposit.balanceAmount === 1400, // 2100 total - 700 charged now
    withDeposit,
  );
  check(
    'depositAmount + balanceAmount reconstructs finalTotal exactly',
    (withDeposit.depositAmount as number) + (withDeposit.balanceAmount as number) === 2100,
    withDeposit,
  );

  console.log('\n--- Part 3: resolveTumiziOrderPaymentStatus (real Tumizi webhook logic) ---');
  check(
    'non-paid mapped status passes through unchanged, even with a deposit on the order',
    resolveTumiziOrderPaymentStatus('failed', { deposit_amount: 700, balance_amount: 1400 }, 700) === 'failed',
  );
  check(
    'paid, but no deposit on the order at all -> stays plain paid (the overwhelming majority of real orders)',
    resolveTumiziOrderPaymentStatus('paid', { deposit_amount: null, balance_amount: null }, 2100) === 'paid',
  );
  check(
    'paid, amount matches the deposit (not the balance) -> deposit_paid',
    resolveTumiziOrderPaymentStatus('paid', { deposit_amount: 700, balance_amount: 1400 }, 700) === 'deposit_paid',
  );
  check(
    'paid, amount matches the outstanding balance -> a genuine later settlement, resolves to fully paid',
    resolveTumiziOrderPaymentStatus('paid', { deposit_amount: 700, balance_amount: 1400 }, 1400) === 'paid',
  );
  check(
    'null order (order not found) -> falls back to the raw mapped status, never throws',
    resolveTumiziOrderPaymentStatus('paid', null, 700) === 'paid',
  );

  console.log('\n--- Part 4: shouldSkipTumiziOrderPaymentDowngrade protects deposit_paid too ---');
  check(
    "a stale 'pending' event must not downgrade an order that's already deposit_paid",
    shouldSkipTumiziOrderPaymentDowngrade('deposit_paid', 'pending') === true,
  );
  check(
    "a genuine 'refunded' event is never blocked, even from deposit_paid",
    shouldSkipTumiziOrderPaymentDowngrade('deposit_paid', 'refunded') === false,
  );
  check(
    'unaffected case: a pending order accepting a paid event is not skipped',
    shouldSkipTumiziOrderPaymentDowngrade('pending', 'paid') === false,
  );

  console.log(`\n${passed}/${total} checks passed.`);
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nDeposit support test failed:', error);
  process.exit(1);
});
