/**
 * Live smoke test for the new "regenerate ALL homepage images at once"
 * capability (@/lib/homepage-images/regenerate-shared,
 * regenerateAllHomepageImages) — built after a real user report that the
 * Dashboard AI Assistant didn't understand "all of them" when asked which
 * homepage image to regenerate (it just repeated the question). Two real
 * gaps existed, not one: the assistant's classify step had no way to
 * represent "all 5", AND the underlying platform had no batch-regenerate
 * capability at all (not even in the direct Homepage Images tab UI) —
 * this test covers the latter, newly-built capability directly.
 *
 * Cost-conscious, same discipline as test-homepage-images-assistant.ts's
 * own docblock ("running it again here would just spend another ~$0.07 to
 * re-prove the same code path"): caps at maxSlots=2 (hero + banner1)
 * rather than the full 5, since 2 real slots is already enough to prove
 * the genuinely new code paths this test exists for — one batched
 * executeNanoBananaJobs call producing multiple images, and ONE combined
 * page-builder patch (applyGenericImagesToPageBuilderData) touching
 * multiple sections — without paying 2.5x more to prove the exact same
 * loop iterating further.
 *
 * Uses the real "Electric Scooters" tenant (Basic plan, already has a
 * real 'home' page from earlier session work) — captures hero/banner1
 * before testing, regenerates both for real (real Gemini cost, real DB
 * patch), verifies banner2/banner3/splitLayout are untouched, verifies
 * 2 real usage rows were recorded, then restores both original images so
 * this repeatedly-reused test tenant's real storefront is left unchanged.
 *
 * Usage: npm run test:homepage-images-regenerate-all
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '2f0abc65-1d1e-4b0d-9dc3-783ff7a3873c'; // Electric Scooters, Basic plan

async function main() {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GEMINI_API_KEY (or GOOGLE_AI_API_KEY) is required in .env.local');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const { getHomepageImagesSnapshot, regenerateAllHomepageImages } = await import('../src/lib/homepage-images/regenerate-shared');
  const { canUseAiFeature } = await import('../src/lib/subscriptions/limits');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: { id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true, plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true, created_at: true, updated_at: true, country: true, data: true },
  });
  if (!tenant) throw new Error(`Test tenant ${TEST_TENANT_ID} not found`);
  console.log(`Using real tenant: ${tenant.name} (${tenant.id})`);

  // 1. Snapshot read — no cost, no side effects.
  const before = await getHomepageImagesSnapshot(tenant.id);
  console.log('\n[1] Current real homepage images:', JSON.stringify(before, null, 2));
  if (!before.homepageFound) throw new Error('Expected this tenant to have a real home page with sections');
  if (!before.hero || !before.banner1) throw new Error('Expected hero and banner1 to have real existing images to compare against');
  const originalHero = before.hero;
  const originalBanner1 = before.banner1;

  // 2. Real quota check — no cost. Need at least 2 remaining for this test.
  const quota = await canUseAiFeature(tenant as any, 'marketing_image_prompt', 'monthly');
  console.log('\n[2] Real quota status (marketing_image_prompt/monthly):', quota);
  const remaining = typeof quota.limit === 'number' ? Math.max(0, quota.limit - (quota.current ?? 0)) : 2;
  if (!quota.allowed || remaining < 2) {
    console.log('Tenant has fewer than 2 remaining regenerations this month — skipping the real regenerate-all call, snapshot/quota checks above still passed.');
    await prisma.$disconnect();
    return;
  }

  // 3. Real regenerate-all (capped to 2 slots) — real Gemini cost x2 + one combined DB patch.
  console.log('\n[3] Regenerating hero + banner1 in ONE batched call (this incurs real Gemini cost, ~10-20s)...');
  const result = await regenerateAllHomepageImages({ tenant: tenant as any, maxSlots: 2 });
  console.log('Result:', JSON.stringify(result, null, 2));
  if (!result.success) throw new Error(`Regenerate-all failed: ${result.error}`);
  if (result.slots.length !== 2) throw new Error(`Expected exactly 2 slots attempted (maxSlots cap), got ${result.slots.length}`);
  if (result.slots[0].slot !== 'hero' || result.slots[1].slot !== 'banner1') {
    throw new Error(`Expected canonical order [hero, banner1], got ${result.slots.map((s) => s.slot).join(', ')}`);
  }
  if (!result.slots.every((s) => s.success)) throw new Error(`Expected both slots to succeed, got: ${JSON.stringify(result.slots)}`);
  if (!result.pagePatched) throw new Error('Expected the live homepage page to be patched');

  // 4. Verify only hero + banner1 changed — banner2/banner3/splitLayout untouched.
  const after = await getHomepageImagesSnapshot(tenant.id);
  console.log('\n[4] Homepage images after regenerate-all:', JSON.stringify(after, null, 2));
  if (after.hero === originalHero) throw new Error('Expected a genuinely new hero image URL, got the same one back');
  if (after.banner1 === originalBanner1) throw new Error('Expected a genuinely new banner1 image URL, got the same one back');
  const untouched = after.banner2 === before.banner2 && after.banner3 === before.banner3 && after.splitLayout === before.splitLayout;
  if (!untouched) throw new Error('Expected banner2/banner3/splitLayout to be untouched by the capped regenerate-all call');
  console.log('PASS: hero + banner1 both changed to genuinely new URLs, banner2/banner3/splitLayout untouched by the shared-patch write.');

  // 5. Verify 2 real usage rows were recorded (not 1 — one per real image, same discipline as DA.28's batching).
  const usageRows = await prisma.ai_usage_log.findMany({
    where: { tenant_id: tenant.id, feature: 'marketing_image_prompt', bucket: 'monthly' },
    orderBy: { created_at: 'desc' },
    take: 2,
  });
  console.log('\n[5] Most recent real usage log rows:', usageRows);
  if (usageRows.length !== 2 || usageRows.some((r) => Number(r.estimated_cost) <= 0)) {
    throw new Error('Expected 2 real, positive-cost usage rows under marketing_image_prompt/monthly — one per regenerated image');
  }
  console.log(`PASS: 2 usage rows recorded correctly (total $${usageRows.reduce((s, r) => s + Number(r.estimated_cost), 0).toFixed(4)}), one per image, not misattributed.`);

  // 6. Restore both original images — this tenant is reused across many live
  // tests this session; leave its real storefront exactly as found.
  const homePage = await prisma.pages.findFirst({ where: { tenant_id: tenant.id, slug: 'home' }, select: { id: true, content: true } });
  if (homePage?.content) {
    const { applyGenericImagesToPageBuilderData } = await import('../src/lib/themes/homepage-templates');
    const parsed = JSON.parse(homePage.content);
    const restored = applyGenericImagesToPageBuilderData(parsed, { hero: originalHero, banners: [originalBanner1, '', ''], splitLayout: null });
    await prisma.pages.update({ where: { id: homePage.id }, data: { content: JSON.stringify(restored) } });
    console.log('\n[6] Restored hero + banner1 to their original images — tenant left as found.');
  }

  await prisma.$disconnect();
  console.log('\nAll checks passed.');
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
