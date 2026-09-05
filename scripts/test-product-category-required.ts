/**
 * Live smoke test for the user-requested "category required before/when
 * adding a product" change:
 *  - requireCategoryBeforeProductIntake() (@/lib/assistant/shared) — real
 *    zero-category detection + real Claude-suggested starter categories.
 *  - The AI product-intake conversation (@/lib/products/ai-intake-shared)
 *    now insists on a real category before finishing, never leaves it null
 *    when the tenant has real categories to pick from.
 *  - Part D: a tenant whose recorded business_type is one of the 10
 *    service-only types (@/lib/categories/business-type-taxonomy.ts) gets a
 *    shipping CONFIRMATION instead of a cold question — user-requested
 *    connection between registration's business type/category and
 *    requires_shipping.
 *
 * Uses the real "testtwo" test tenant (8 real categories: Cookware,
 * Kitchen Appliances, Dining & Serving, Storage & Organization, Bakeware,
 * Cutlery & Knives, Cleaning, Table Linens).
 *
 * Part B temporarily deactivates (status: 'inactive', never deletes) all
 * of testtwo's real categories to exercise the genuine zero-category path,
 * then restores them to 'active' immediately after — this tenant is reused
 * by other live tests in this session and must be left exactly as found.
 *
 * Usage: npm run test:product-category-required
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = 'e401c99b-c078-4ab4-96f9-fc901f9110a9'; // testtwo

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const { requireCategoryBeforeProductIntake } = await import('../src/lib/assistant/shared');
  const { runProductIntakeTurn } = await import('../src/lib/products/ai-intake-shared');

  const tenant = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID } });
  if (!tenant) throw new Error('Test tenant not found');

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

  // --- Part A: tenant HAS real categories -> proceed straight to intake ---
  console.log('--- Part A: requireCategoryBeforeProductIntake with real existing categories ---');
  const gateWithCategories = await requireCategoryBeforeProductIntake(tenant as any);
  check('returns null (no gate) when categories exist', gateWithCategories === null, gateWithCategories);

  // --- Part B: genuinely zero categories -> real redirect prompt ---
  console.log('\n--- Part B: requireCategoryBeforeProductIntake with zero categories (temporarily) ---');
  const realCategories = await prisma.categories.findMany({ where: { tenant_id: TEST_TENANT_ID, status: 'active' } });
  try {
    await prisma.categories.updateMany({ where: { tenant_id: TEST_TENANT_ID }, data: { status: 'inactive' } });

    const gateNoCategories = await requireCategoryBeforeProductIntake(tenant as any);
    console.log('answer:', gateNoCategories?.answer);
    console.log('data:', gateNoCategories?.data);
    check('returns a real gate response when zero categories exist', gateNoCategories !== null, gateNoCategories);
    if (gateNoCategories) {
      const gateData = gateNoCategories.data as any;
      check('gate targets category creation', gateData?.target === 'category', gateData);
      check('gate flags blockedProductIntake', gateData?.blockedProductIntake === true, gateData);
      check('gate includes real, non-empty suggested category names', Array.isArray(gateData?.suggested) && gateData.suggested.length > 0, gateData?.suggested);
    }
  } finally {
    // Always restore — even if an assertion above threw.
    await prisma.categories.updateMany({ where: { tenant_id: TEST_TENANT_ID }, data: { status: 'active' } });
    const restoredCount = await prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID, status: 'active' } });
    check('all 8 real categories restored to active', restoredCount === realCategories.length, restoredCount);
  }

  // --- Part C: the intake conversation itself requires a category before done:true ---
  console.log('\n--- Part C: product intake conversation insists on a category before finishing ---');
  const turn1 = await runProductIntakeTurn(TEST_TENANT_ID, [
    { role: 'user', content: 'add a product called Bamboo Cutting Board, price 1500' },
  ]);
  console.log('turn1 reply:', turn1.data.reply);
  console.log('turn1 done:', turn1.data.done, 'collected:', turn1.data.collected);
  check('does NOT finish (done:true) without a category, even with name+price given', turn1.data.done !== true || turn1.data.collected.category !== null, turn1.data);

  const turn2 = await runProductIntakeTurn(TEST_TENANT_ID, [
    { role: 'user', content: 'add a product called Bamboo Cutting Board, price 1500' },
    { role: 'assistant', content: JSON.stringify(turn1.data) },
    { role: 'user', content: 'put it under Cookware, no SKU or stock needed' },
  ]);
  console.log('\nturn2 reply:', turn2.data.reply);
  console.log('turn2 done:', turn2.data.done, 'collected:', turn2.data.collected);
  check('collected.category matches the real category name given', turn2.data.collected.category === 'Cookware', turn2.data.collected.category);
  // Basic services support (docs/SERVICES_PLAN.md) added a second required
  // field (requiresShipping) — a category alone no longer finishes the
  // conversation, same "never done while a required field is null"
  // discipline this test already covers for category itself.
  check('does NOT finish (done:true) without requiresShipping answered, even with category given', turn2.data.done !== true || turn2.data.collected.requiresShipping !== null, turn2.data);

  const turn3 = await runProductIntakeTurn(TEST_TENANT_ID, [
    { role: 'user', content: 'add a product called Bamboo Cutting Board, price 1500' },
    { role: 'assistant', content: JSON.stringify(turn1.data) },
    { role: 'user', content: 'put it under Cookware, no SKU or stock needed' },
    { role: 'assistant', content: JSON.stringify(turn2.data) },
    { role: 'user', content: 'yes it ships, physical product' },
  ]);
  console.log('\nturn3 reply:', turn3.data.reply);
  console.log('turn3 done:', turn3.data.done, 'collected:', turn3.data.collected);
  check('collected.requiresShipping is true for a physical product', turn3.data.collected.requiresShipping === true, turn3.data.collected.requiresShipping);
  // Basic deposit support (docs/SERVICES_PLAN.md, S-Dep.9) added a 3rd
  // optional-but-asked-once field — category+requiresShipping alone no
  // longer finishes the conversation, same "never done while a field that
  // was just asked about is still null" discipline as the requiresShipping
  // check above.
  check('does NOT finish (done:true) without depositType answered, even with requiresShipping given', turn3.data.done !== true || turn3.data.collected.depositType !== null, turn3.data);

  const turn4 = await runProductIntakeTurn(TEST_TENANT_ID, [
    { role: 'user', content: 'add a product called Bamboo Cutting Board, price 1500' },
    { role: 'assistant', content: JSON.stringify(turn1.data) },
    { role: 'user', content: 'put it under Cookware, no SKU or stock needed' },
    { role: 'assistant', content: JSON.stringify(turn2.data) },
    { role: 'user', content: 'yes it ships, physical product' },
    { role: 'assistant', content: JSON.stringify(turn3.data) },
    { role: 'user', content: 'no deposit needed' },
  ]);
  console.log('\nturn4 reply:', turn4.data.reply);
  console.log('turn4 done:', turn4.data.done, 'collected:', turn4.data.collected);
  check('finishes with done:true once category, requiresShipping, AND depositType are all given', turn4.data.done === true, turn4.data);
  check('collected.depositType is "none" after declining', turn4.data.collected.depositType === 'none', turn4.data.collected.depositType);

  // --- Part D: a service-only business type gets a CONFIRMATION, not a cold question ---
  // User-requested connection: "when the store is registered do we track
  // what is a service based on what the user selects as a business type /
  // category?" — temporarily switches testtwo's recorded business_type to
  // a service-only type to exercise buildProductIntakeSystemPrompt's
  // confirm-instead-of-ask-cold branch, then restores it.
  console.log('\n--- Part D: service-only business type gets a shipping confirmation, not a cold question ---');
  const tenantRow = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID }, select: { data: true } });
  const originalData = (tenantRow?.data ?? {}) as Record<string, unknown>;
  const originalBusinessType = originalData.business_type;
  try {
    await prisma.tenants.update({
      where: { id: TEST_TENANT_ID },
      data: { data: { ...originalData, business_type: 'Repair & Technical Services' } },
    });

    // Deliberately assertive about the category ("that's fine") — testtwo's
    // real categories are all Home & Kitchen-themed since only business_type
    // is swapped here, not the categories table, and this part is testing
    // the requiresShipping confirmation, not category-matching semantics.
    const serviceTurn1 = await runProductIntakeTurn(TEST_TENANT_ID, [
      {
        role: 'user',
        content: 'add a product called Phone Screen Replacement, price 2500. Put it under Cookware, that\'s fine, I know it is not a perfect fit.',
      },
    ]);
    console.log('serviceTurn1 reply:', serviceTurn1.data.reply);
    console.log('serviceTurn1 done:', serviceTurn1.data.done, 'collected:', serviceTurn1.data.collected);
    check('collected.category was accepted as given', serviceTurn1.data.collected.category === 'Cookware', serviceTurn1.data.collected.category);
    const replyLower = serviceTurn1.data.reply.toLowerCase();
    check(
      "reply confirms an assumption (mentions 'assume'/'shipping'/business type) rather than asking a neutral yes/no question",
      replyLower.includes('assume') || replyLower.includes("doesn't need shipping") || replyLower.includes('repair & technical services'),
      serviceTurn1.data.reply,
    );

    const serviceTurn2 = await runProductIntakeTurn(TEST_TENANT_ID, [
      {
        role: 'user',
        content: 'add a product called Phone Screen Replacement, price 2500. Put it under Cookware, that\'s fine, I know it is not a perfect fit.',
      },
      { role: 'assistant', content: JSON.stringify(serviceTurn1.data) },
      { role: 'user', content: "yes that's right, no sku needed" },
    ]);
    console.log('\nserviceTurn2 reply:', serviceTurn2.data.reply);
    console.log('serviceTurn2 done:', serviceTurn2.data.done, 'collected:', serviceTurn2.data.collected);
    check(
      'collected.requiresShipping is false once the merchant confirms the service assumption',
      serviceTurn2.data.collected.requiresShipping === false,
      serviceTurn2.data.collected.requiresShipping,
    );
    check(
      'stockQuantity was never asked about (service item)',
      serviceTurn2.data.collected.stockQuantity === null,
      serviceTurn2.data.collected.stockQuantity,
    );

    // Basic deposit support (docs/SERVICES_PLAN.md, S-Dep.9) — a service
    // is exactly the kind of item a deposit makes sense for (e.g. a repair
    // booking), so this confirms the fixed/percentage path, not just "none"
    // (already covered by test-services-no-shipping.ts).
    const serviceTurn3 = await runProductIntakeTurn(TEST_TENANT_ID, [
      {
        role: 'user',
        content: 'add a product called Phone Screen Replacement, price 2500. Put it under Cookware, that\'s fine, I know it is not a perfect fit.',
      },
      { role: 'assistant', content: JSON.stringify(serviceTurn1.data) },
      { role: 'user', content: "yes that's right, no sku needed" },
      { role: 'assistant', content: JSON.stringify(serviceTurn2.data) },
      { role: 'user', content: 'yes, a fixed KES 500 deposit upfront' },
    ]);
    console.log('\nserviceTurn3 reply:', serviceTurn3.data.reply);
    console.log('serviceTurn3 done:', serviceTurn3.data.done, 'collected:', serviceTurn3.data.collected);
    check('finishes with done:true once confirmed', serviceTurn3.data.done === true, serviceTurn3.data);
    check(
      'collected.depositType is "fixed" for a stated fixed deposit',
      serviceTurn3.data.collected.depositType === 'fixed',
      serviceTurn3.data.collected.depositType,
    );
    check(
      'collected.depositValue is 500 for the stated fixed deposit',
      serviceTurn3.data.collected.depositValue === 500,
      serviceTurn3.data.collected.depositValue,
    );
  } finally {
    await prisma.tenants.update({
      where: { id: TEST_TENANT_ID },
      data: { data: { ...originalData, business_type: originalBusinessType } },
    });
    const restoredTenant = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID }, select: { data: true } });
    const restoredBusinessType = (restoredTenant?.data as Record<string, unknown> | null)?.business_type;
    check('original business_type restored', restoredBusinessType === originalBusinessType, restoredBusinessType);
  }

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
