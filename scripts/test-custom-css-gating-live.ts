/**
 * Live smoke test for Theme Track B1.4 — real Custom CSS Pro-gating +
 * sanitization, wired into the shared save path
 * (@/lib/themes/tenant-theme-admin's updateTenantThemeCustomizations,
 * used by both the mobile dashboard route and, via the same logic
 * inlined, the web PUT /api/themes/current route).
 *
 * Follows the same real-tenant, real-rejection-path, zero-net-mutation
 * pattern as DA.30's test:theme-tier-gating:
 *
 * Part 1: real Basic-plan tenant (Electric Scooters) attempts to save
 * non-empty custom_css -> expect a real TenantThemeAdminError(403) BEFORE
 * any write. Confirms the DB row is untouched afterward.
 *
 * Part 2: temporarily flip that same tenant to a real Pro plan, save a
 * known CSS-XSS payload (javascript: url + a safe declaration), confirm
 * the stored value has been sanitized (attack payload stripped, safe
 * declaration kept) by reading it straight back from the DB. Reverts the
 * tenant's plan and clears the test custom_css afterward, leaving the
 * tenant exactly as found.
 *
 * Usage: npm run test:custom-css-gating-live
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '2f0abc65-1d1e-4b0d-9dc3-783ff7a3873c'; // Electric Scooters

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const { updateTenantThemeCustomizations, TenantThemeAdminError } = await import(
    '../src/lib/themes/tenant-theme-admin'
  );

  let passed = 0;
  let total = 0;

  const tenant = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID } });
  if (!tenant) throw new Error(`Test tenant ${TEST_TENANT_ID} not found`);
  console.log(`Using real tenant: ${tenant.name} (plan_id=${tenant.plan_id})`);

  const originalPlanId = tenant.plan_id;
  const originalPlan = originalPlanId
    ? await prisma.price_plans.findUnique({ where: { id: originalPlanId }, select: { name: true } })
    : null;
  console.log(`Original plan: ${originalPlan?.name ?? '(none)'}`);

  const tenantThemeBefore = await prisma.tenant_themes.findFirst({
    where: { tenant_id: TEST_TENANT_ID, is_active: true },
  });
  if (!tenantThemeBefore) throw new Error('Test tenant has no active theme — cannot run this test');
  const originalCustomCss = tenantThemeBefore.custom_css;

  const basicPlan = await prisma.price_plans.findFirst({ where: { name: { contains: 'Basic', mode: 'insensitive' } } });
  const proPlan = await prisma.price_plans.findFirst({
    where: { OR: [{ name: { contains: 'Pro', mode: 'insensitive' } }, { name: { contains: 'Premium', mode: 'insensitive' } }] },
  });
  if (!basicPlan) throw new Error('No real Basic price plan found');
  if (!proPlan) throw new Error('No real Pro/Premium price plan found');
  console.log(`Basic plan: ${basicPlan.name} (${basicPlan.id}); Pro plan: ${proPlan.name} (${proPlan.id})`);

  try {
    // --- Part 1: Basic-plan tenant, real rejection path ---
    await prisma.tenants.update({ where: { id: TEST_TENANT_ID }, data: { plan_id: basicPlan.id } });

    total++;
    let rejected = false;
    let rejectionMessage = '';
    try {
      await updateTenantThemeCustomizations(TEST_TENANT_ID, { custom_css: 'body { color: red; }' });
    } catch (error) {
      if (error instanceof TenantThemeAdminError && error.status === 403) {
        rejected = true;
        rejectionMessage = error.message;
      } else {
        throw error;
      }
    }
    console.log(`[1] Basic-plan custom_css save rejected: ${rejected}, message: "${rejectionMessage}"`);
    if (rejected && /Pro feature/i.test(rejectionMessage)) passed++;
    else console.log('  FAIL: expected a real TenantThemeAdminError(403) mentioning "Pro feature"');

    total++;
    const rowAfterRejection = await prisma.tenant_themes.findUnique({ where: { id: tenantThemeBefore.id } });
    const untouched = rowAfterRejection?.custom_css === originalCustomCss;
    console.log(`[2] custom_css untouched by the rejected Basic-plan attempt: ${untouched}`);
    if (untouched) passed++;

    // --- Part 2: Pro-plan tenant, real sanitize-and-persist path ---
    await prisma.tenants.update({ where: { id: TEST_TENANT_ID }, data: { plan_id: proPlan.id } });

    const maliciousCss = "body { background: url(javascript:alert(1)); color: teal; }";
    await updateTenantThemeCustomizations(TEST_TENANT_ID, { custom_css: maliciousCss });

    const rowAfterProSave = await prisma.tenant_themes.findUnique({ where: { id: tenantThemeBefore.id } });
    const savedCss = rowAfterProSave?.custom_css ?? '';

    total++;
    const attackStripped = !savedCss.includes('javascript:');
    console.log(`[3] javascript: url() stripped from what's actually stored in the DB: ${attackStripped}`, savedCss);
    if (attackStripped) passed++;

    total++;
    const safeRuleKept = savedCss.includes('color: teal');
    console.log(`[4] Safe sibling declaration survived sanitization: ${safeRuleKept}`);
    if (safeRuleKept) passed++;

    console.log(`\n${passed}/${total} checks passed.`);
    if (passed !== total) process.exitCode = 1;
  } finally {
    // Revert: restore original plan and original custom_css exactly.
    await prisma.tenants.update({ where: { id: TEST_TENANT_ID }, data: { plan_id: originalPlanId } });
    await prisma.tenant_themes.update({
      where: { id: tenantThemeBefore.id },
      data: { custom_css: originalCustomCss },
    });
    console.log('\nReverted: tenant plan_id and custom_css restored to their real original values.');
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
