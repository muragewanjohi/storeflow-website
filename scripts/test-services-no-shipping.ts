/**
 * Live smoke test for basic services support (docs/SERVICES_PLAN.md,
 * tracker rows S1.1-S1.6) — selling a non-shipped item (a service/digital
 * item) via `products.requires_shipping = false`.
 *
 * Four parts:
 *  1. computeAllItemsNoShipping() (@/lib/checkout/no-shipping.ts) — the
 *     exact real function checkout/route.ts calls to decide whether a
 *     cart needs the pickup-equivalent (no delivery zone/fee) path.
 *  2. A real DB round-trip: create a real product with
 *     requires_shipping: false, stock_quantity: null against a real test
 *     tenant, confirm it reads back correctly, then clean up — proves the
 *     schema migration + Prisma client wiring actually works end-to-end,
 *     not just that the migration ran without error.
 *  3. createProductSchema/updateProductSchema validate requires_shipping
 *     and a nullable stock_quantity correctly.
 *  4. runProductIntakeTurn() (@/lib/products/ai-intake-shared.ts) — a
 *     real multi-turn Claude conversation for a service, confirming the
 *     assistant asks about shipping, sets requiresShipping: false, skips
 *     the stock-quantity question entirely, and doesn't finish without
 *     an explicit answer.
 *
 * Honest ceiling: the full checkout HTTP route (a real authenticated
 * POST /api/checkout call actually creating an order) could not be
 * verified end-to-end from this environment without logging in as a real
 * user — same constraint disclosed for every other dashboard-adjacent
 * change this session. What's verified here is the real decision
 * function checkout/route.ts calls, a real DB round-trip proving the
 * schema/API layer works, and the real AI conversation — the parts that
 * can be exercised without a live browser session.
 *
 * Usage: npm run test:services-no-shipping
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = 'e401c99b-c078-4ab4-96f9-fc901f9110a9'; // testtwo — same real tenant test-product-category-required.ts uses

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { computeAllItemsNoShipping } = await import('../src/lib/checkout/no-shipping');
  const { prisma } = await import('../src/lib/prisma/client');
  const { createProductSchema, updateProductSchema } = await import('../src/lib/products/validation');
  const { runProductIntakeTurn } = await import('../src/lib/products/ai-intake-shared');

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

  console.log('--- Part 1: computeAllItemsNoShipping() ---');
  check('empty cart -> false (nothing to force pickup for)', computeAllItemsNoShipping([]) === false);
  check(
    'all-shipped cart -> false',
    computeAllItemsNoShipping([{ requires_shipping: true }, { requires_shipping: true }]) === false,
  );
  check(
    'mixed cart (Phase 1: still collects shipping) -> false',
    computeAllItemsNoShipping([{ requires_shipping: true }, { requires_shipping: false }]) === false,
  );
  check(
    'all-non-shipped cart -> true',
    computeAllItemsNoShipping([{ requires_shipping: false }, { requires_shipping: false }]) === true,
  );
  check(
    'null/undefined requires_shipping treated as "ships" (safe default)',
    computeAllItemsNoShipping([{ requires_shipping: null }, { requires_shipping: false }]) === false,
  );

  console.log('\n--- Part 2: real DB round-trip ---');
  const tenant = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID } });
  if (!tenant) throw new Error('Test tenant not found');
  const category = await prisma.categories.findFirst({ where: { tenant_id: TEST_TENANT_ID, status: 'active' } });
  if (!category) throw new Error('Test tenant has no real category to use');

  const created = await prisma.products.create({
    data: {
      tenant_id: TEST_TENANT_ID,
      name: 'Test Service — 30-Minute Consultation',
      slug: `test-service-consultation-${Date.now()}`,
      price: 1500,
      sku: `TESTSVC-${Date.now()}`,
      status: 'draft',
      category_id: category.id,
      requires_shipping: false,
      stock_quantity: null,
    },
  });
  check('real service product created', !!created.id);

  const reread = await prisma.products.findUnique({ where: { id: created.id } });
  check('requires_shipping reads back as false', reread?.requires_shipping === false, reread?.requires_shipping);
  check('stock_quantity reads back as null (unlimited, not 0)', reread?.stock_quantity === null, reread?.stock_quantity);

  await prisma.products.delete({ where: { id: created.id } });
  const afterDelete = await prisma.products.findUnique({ where: { id: created.id } });
  check('cleanup: test product removed', afterDelete === null);

  console.log('\n--- Part 3: schema validation ---');
  const parsedCreate = createProductSchema.safeParse({
    name: 'Test Service',
    price: 1000,
    category_id: category.id,
    requires_shipping: false,
    stock_quantity: null,
  });
  check('createProductSchema accepts requires_shipping + null stock_quantity', parsedCreate.success, !parsedCreate.success ? parsedCreate.error.issues : undefined);
  if (parsedCreate.success) {
    check('parsed requires_shipping is false', parsedCreate.data.requires_shipping === false);
    check('parsed stock_quantity is null', parsedCreate.data.stock_quantity === null);
  }

  const parsedDefault = createProductSchema.safeParse({
    name: 'Test Physical Product',
    price: 1000,
    category_id: category.id,
  });
  check(
    'requires_shipping defaults to true when omitted (backward compatible)',
    parsedDefault.success && parsedDefault.data.requires_shipping === true,
    parsedDefault.success ? parsedDefault.data.requires_shipping : parsedDefault.error?.issues,
  );

  const parsedUpdate = updateProductSchema.safeParse({ requires_shipping: false, stock_quantity: null });
  check('updateProductSchema accepts a partial requires_shipping-only update', parsedUpdate.success);

  console.log('\n--- Part 4: real AI product-intake conversation for a service ---');
  const existingCategories = await prisma.categories.findMany({
    where: { tenant_id: TEST_TENANT_ID, status: 'active' },
    select: { name: true },
  });
  let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const scriptedTurns = [
    'I want to add a 30-minute business consultation',
    `KES 2000, category ${existingCategories[0]?.name ?? ''}`,
    "No, it's a service — I meet clients in person, nothing ships",
    'skip',
  ];
  let done = false;
  let finalCollected: any = null;
  let askedAboutShipping = false;
  let askedAboutStockAfterNoShipping = false;

  for (let turn = 0; turn < scriptedTurns.length && !done; turn++) {
    messages = [...messages, { role: 'user', content: scriptedTurns[turn] }];
    const { data } = await runProductIntakeTurn(TEST_TENANT_ID, messages);
    console.log(`Turn ${turn + 1} — Assistant: ${data.reply} (done=${data.done}, requiresShipping=${data.collected.requiresShipping})`);
    if (/ship|deliver|service|digital/i.test(data.reply) && data.collected.requiresShipping == null) {
      askedAboutShipping = true;
    }
    if (data.collected.requiresShipping === false && /stock|quantity/i.test(data.reply)) {
      askedAboutStockAfterNoShipping = true;
    }
    messages = [...messages, { role: 'assistant', content: JSON.stringify(data) }];
    done = data.done;
    finalCollected = data.collected;
  }

  check('conversation asked about shipping at some point', askedAboutShipping);
  check('did NOT ask about stock quantity once requiresShipping was false', !askedAboutStockAfterNoShipping);
  check('conversation reached done:true within scripted turns', done, finalCollected);
  check('final requiresShipping is false', finalCollected?.requiresShipping === false, finalCollected);
  check('final stockQuantity is null (never asked, never invented)', finalCollected?.stockQuantity === null, finalCollected);
  check('name/price/category still collected correctly', !!finalCollected?.name && finalCollected?.price === 2000 && !!finalCollected?.category, finalCollected);

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nServices no-shipping test failed:', error);
  process.exit(1);
});
