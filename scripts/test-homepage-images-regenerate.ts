/**
 * Live smoke test for DA.25's post-registration homepage image regenerate
 * feature (@/lib/homepage-images/regenerate-shared), exercised directly
 * against the real DB/Gemini API — the same in-process pattern every other
 * live test script in this session uses (see test-claude-assistant-mobile.ts).
 *
 * Uses the real "Electric Scooters" tenant (Basic plan, already has a real
 * 'home' page with hero/banners/split_layout sections from earlier session
 * work) — captures its current banner2 image before testing, regenerates
 * it for real (real Gemini cost, real DB patch), verifies the patch only
 * touched that one slot, then restores the original image so this
 * repeatedly-reused test tenant's real storefront is left unchanged.
 *
 * Usage: npm run test:homepage-images-regenerate
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
  const { getHomepageImagesSnapshot, regenerateHomepageImage } = await import('../src/lib/homepage-images/regenerate-shared');
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
  if (!before.banner2) throw new Error('Expected banner2 to have a real existing image to compare against');
  const originalBanner2 = before.banner2;

  // 2. Real quota check — no cost.
  const quota = await canUseAiFeature(tenant as any, 'marketing_image_prompt', 'monthly');
  console.log('\n[2] Real quota status (marketing_image_prompt/monthly):', quota);
  if (!quota.allowed) {
    console.log('Tenant has no remaining quota this month — skipping the real regenerate call, snapshot/quota checks above still passed.');
    await prisma.$disconnect();
    return;
  }

  // 3. Real regenerate — real Gemini cost + real DB patch.
  console.log('\n[3] Regenerating banner2 for real (this incurs real Gemini cost, ~10-20s)...');
  const result = await regenerateHomepageImage({ tenant: tenant as any, slot: 'banner2' });
  console.log('Result:', result);
  if (!result.success) throw new Error(`Regenerate failed: ${result.error}`);
  if (!result.pagePatched) throw new Error('Expected the live homepage page to be patched');
  if (result.imageUrl === originalBanner2) throw new Error('Expected a genuinely new image URL, got the same one back');

  // 4. Verify only banner2 changed — hero/banner1/banner3/splitLayout untouched.
  const after = await getHomepageImagesSnapshot(tenant.id);
  console.log('\n[4] Homepage images after regenerate:', JSON.stringify(after, null, 2));
  const unchanged = after.hero === before.hero && after.banner1 === before.banner1 && after.banner3 === before.banner3 && after.splitLayout === before.splitLayout;
  if (!unchanged) throw new Error('Expected only banner2 to change — another slot was touched');
  if (after.banner2 !== result.imageUrl) throw new Error('Expected banner2 in the live page to match the returned imageUrl');
  console.log('PASS: only banner2 changed, matches the returned imageUrl, all other slots untouched.');

  // 5. Verify real usage was recorded under the correct feature/bucket (not starter_pack_image/setup).
  const usageRow = await prisma.ai_usage_log.findFirst({
    where: { tenant_id: tenant.id, feature: 'marketing_image_prompt', bucket: 'monthly' },
    orderBy: { created_at: 'desc' },
  });
  console.log('\n[5] Real usage log row:', usageRow);
  if (!usageRow || Number(usageRow.estimated_cost) <= 0) throw new Error('Expected a real, positive-cost usage row under marketing_image_prompt/monthly');
  console.log(`PASS: usage recorded correctly ($${usageRow.estimated_cost}, feature=marketing_image_prompt, bucket=monthly) — not misattributed to starter_pack_image/setup.`);

  // 6. Restore the original banner2 image — this tenant is reused across many
  // live tests this session; leave its real storefront exactly as found.
  const homePage = await prisma.pages.findFirst({ where: { tenant_id: tenant.id, slug: 'home' }, select: { id: true, content: true } });
  if (homePage?.content) {
    const { applySingleHomepageImageToPageBuilderData } = await import('../src/lib/themes/homepage-templates');
    const parsed = JSON.parse(homePage.content);
    const restored = applySingleHomepageImageToPageBuilderData(parsed, 'banner2', originalBanner2);
    await prisma.pages.update({ where: { id: homePage.id }, data: { content: JSON.stringify(restored) } });
    console.log('\n[6] Restored banner2 to its original image — tenant left as found.');
  }

  await prisma.$disconnect();
  console.log('\nAll checks passed.');
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
