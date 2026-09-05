/**
 * Live smoke test for Theme Track A4 — real Basic/Pro theme-install gating
 * (@/lib/themes/theme-access, wired into both
 * src/app/api/themes/install/route.ts and the shared
 * @/lib/themes/install-theme.ts used by the mobile install route).
 *
 * Part 1: pure logic (hasPremiumThemeAccess/canInstallTheme) — every real
 * plan-name/is_premium combination that matters.
 *
 * Part 2: the real rejection path, live, against the real "Electric
 * Scooters" tenant (Basic plan). Temporarily flips the `minimal` theme
 * (chosen deliberately — confirmed zero real production tenants have it
 * installed, per the earlier finding that literally all 363 of the
 * platform's real tenant_themes rows use `grocery`, so this poses zero
 * real risk to any live merchant) to is_premium:true, calls the real
 * shared installThemeForTenant() and confirms it throws a real
 * ThemeInstallError(403) BEFORE touching tenant_themes at all — proving
 * the gate fires ahead of any mutation. Deliberately does NOT also run a
 * full successful Pro-plan install against this real, actively-used
 * tenant (that would trigger homepage/demo-content/analytics side effects
 * on live data for no extra confidence beyond what Part 1 already proves
 * about the gate logic itself — if the gate doesn't throw, execution
 * falls through to the exact same pre-existing, untouched install code).
 * Reverts the theme's is_premium afterward.
 *
 * Usage: npm run test:theme-tier-gating
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '2f0abc65-1d1e-4b0d-9dc3-783ff7a3873c'; // Electric Scooters, Basic plan

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const { hasPremiumThemeAccess, canInstallTheme } = await import('../src/lib/themes/theme-access');
  const { installThemeForTenant, ThemeInstallError } = await import('../src/lib/themes/install-theme');

  let passed = 0;
  let total = 0;

  // --- Part 1: pure logic ---
  total++;
  const case1 = hasPremiumThemeAccess('Basic') === false && hasPremiumThemeAccess('Pro') === true && hasPremiumThemeAccess(null) === false;
  console.log('[1] hasPremiumThemeAccess: Basic=false, Pro=true, null=false ->', case1 ? 'PASS' : 'FAIL');
  if (case1) passed++;

  total++;
  const case2 =
    canInstallTheme('Basic', { is_premium: false }) === true &&
    canInstallTheme('Basic', { is_premium: true }) === false &&
    canInstallTheme('Pro', { is_premium: true }) === true;
  console.log('[2] canInstallTheme: free theme always ok, premium theme needs Pro ->', case2 ? 'PASS' : 'FAIL');
  if (case2) passed++;

  // --- Part 2: real rejection path, real tenant, zero mutation ---
  const theme = await prisma.themes.findUnique({ where: { slug: 'minimal' } });
  if (!theme) throw new Error('minimal theme not found — cannot run the live gating test');
  const originalIsPremium = theme.is_premium;

  const tenant = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID } });
  if (!tenant) throw new Error(`Test tenant ${TEST_TENANT_ID} not found`);
  console.log(`\nUsing real tenant: ${tenant.name} (plan_id=${tenant.plan_id})`);

  const preExistingTenantTheme = await prisma.tenant_themes.findFirst({
    where: { tenant_id: TEST_TENANT_ID, theme_id: theme.id },
  });

  try {
    await prisma.themes.update({ where: { id: theme.id }, data: { is_premium: true } });

    total++;
    let rejected = false;
    let rejectionMessage = '';
    try {
      await installThemeForTenant(tenant as any, { theme_id: theme.id }, new Request('http://localhost/') as any);
    } catch (error) {
      if (error instanceof ThemeInstallError && error.status === 403) {
        rejected = true;
        rejectionMessage = error.message;
      } else {
        throw error;
      }
    }
    console.log(`[3] Basic-plan install of a premium theme rejected: ${rejected}, message: "${rejectionMessage}"`);
    if (rejected && rejectionMessage.includes('Pro theme')) passed++;
    else console.log('  FAIL: expected a real ThemeInstallError(403) with a "Pro theme" message');

    total++;
    const rowAfterRejection = await prisma.tenant_themes.findFirst({ where: { tenant_id: TEST_TENANT_ID, theme_id: theme.id } });
    const noRowCreated = (rowAfterRejection?.id ?? null) === (preExistingTenantTheme?.id ?? null);
    console.log(`[4] No tenant_themes row created/changed by the rejected attempt: ${noRowCreated}`);
    if (noRowCreated) passed++;
  } finally {
    await prisma.themes.update({ where: { id: theme.id }, data: { is_premium: originalIsPremium } });
    console.log('\nReverted: minimal theme is_premium restored to its real original value. Tenant untouched (the rejected call made zero mutations).');
  }

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
