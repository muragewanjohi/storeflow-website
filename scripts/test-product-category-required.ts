/**
 * Live smoke test for the user-requested "category required before/when
 * adding a product" change:
 *  - requireCategoryBeforeProductIntake() (@/lib/assistant/shared) — real
 *    zero-category detection + real Claude-suggested starter categories.
 *  - The AI product-intake conversation (@/lib/products/ai-intake-shared)
 *    now insists on a real category before finishing, never leaves it null
 *    when the tenant has real categories to pick from.
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
  check('finishes with done:true once a real category is given', turn2.data.done === true, turn2.data);
  check('collected.category matches the real category name given', turn2.data.collected.category === 'Cookware', turn2.data.collected.category);

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
