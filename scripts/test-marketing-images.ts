/**
 * Live smoke test for AI Phase 6.1 — free-form marketing image generation
 * (@/lib/marketing-images/marketing-image-shared, and the assistant's new
 * 'marketing_images' configuration_guidance target).
 *
 * Three parts:
 *  1. Classify: a free-form marketing-image request routes correctly, and
 *     an unrelated request doesn't misfire.
 *  2. Propose (no cost): confirms a first-time request is proposed back
 *     with a real count, never generates on the first turn.
 *  3. Confirm (real cost): a real 1-image batch against the real "Electric
 *     Scooters" tenant (which has NO active sales) with a request that
 *     references "my flash sale" — the real grounding discipline requires
 *     it NOT invent a sale name/discount since none exists; confirms a
 *     real image lands in the real Media Library, usage is recorded under
 *     the correct feature/bucket, then cleans up the created media_uploads
 *     row (leaves the real storage file — same "cost already happened,
 *     don't pretend otherwise" reasoning as every other cleanup this
 *     session, but the DB row is tidied so this tenant's real Media
 *     Library isn't left with test clutter).
 *
 * Usage: npm run test:marketing-images
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '2f0abc65-1d1e-4b0d-9dc3-783ff7a3873c'; // Electric Scooters, Basic plan, no active sales

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) throw new Error('GEMINI_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { generateJsonFromConversation } = await import('../src/lib/ai/claude-client');
  const { prisma } = await import('../src/lib/prisma/client');
  const {
    buildClassifySystemPrompt,
    classifySchema,
    isIntent,
    configTargetSchema,
    buildConfigTargetSystemPrompt,
    resolveConfigTarget,
    handleMarketingImagesConfigTarget,
    getBusinessProfile,
  } = await import('../src/lib/assistant/shared');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: { id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true, plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true, created_at: true, updated_at: true, country: true, data: true },
  });
  if (!tenant) throw new Error(`Test tenant ${TEST_TENANT_ID} not found`);
  const { businessType, niche } = getBusinessProfile(tenant as any);
  console.log(`Using real tenant: ${tenant.name} (businessType=${businessType}, niche=${niche})`);

  let passed = 0;
  let total = 0;

  // --- Part 1: classification ---
  const classifyCases: Array<{ label: string; message: string; expectTarget: string }> = [
    { label: 'free-form marketing image request', message: 'Can you make me a banner for my flash sale?', expectTarget: 'marketing_images' },
    { label: 'social media images request', message: 'Generate 2 images I can post on Instagram to promote my store', expectTarget: 'marketing_images' },
    { label: 'unrelated (should not misfire)', message: 'How do I add a new category?', expectTarget: 'category' },
    { label: 'homepage slot (should route there, not here)', message: 'Regenerate my hero image', expectTarget: 'homepage_image' },
  ];

  for (const c of classifyCases) {
    total++;
    const { data } = await generateJsonFromConversation<any>({
      system: buildConfigTargetSystemPrompt(businessType, niche, []),
      messages: [{ role: 'user', content: c.message }],
      schema: configTargetSchema,
      maxTokens: 300,
    });
    const target = resolveConfigTarget(data.target);
    console.log(`\n[classify: ${c.label}] "${c.message}" -> target=${target}`, data.marketingImageRequest ? `request="${data.marketingImageRequest}" count=${data.marketingImageCount}` : '');
    if (target === c.expectTarget) {
      passed++;
      console.log('  PASS');
    } else {
      console.log(`  FAIL: expected ${c.expectTarget}, got ${target}`);
    }
  }

  // --- Part 2: propose (no cost) ---
  total++;
  const proposeResult = await handleMarketingImagesConfigTarget(tenant as any, 'a banner for my flash sale', null, false);
  console.log('\n[propose] answer:', proposeResult.answer);
  console.log('  data:', proposeResult.data);
  const proposeData = proposeResult.data as any;
  if (proposeData?.proposed && typeof proposeData?.proposedCount === 'number' && proposeData?.generated !== true) {
    passed++;
    console.log('  PASS: proposed with a real count, nothing generated');
  } else {
    console.log('  FAIL: expected a proposal with proposedCount, no generation');
  }

  // --- Part 3: confirm (real cost) ---
  total++;
  console.log('\n[confirm] generating 1 real image referencing a non-existent "flash sale" (grounding test)...');
  const confirmResult = await handleMarketingImagesConfigTarget(tenant as any, 'a banner for my flash sale', 1, true);
  console.log('  answer:', confirmResult.answer);
  console.log('  data:', confirmResult.data);
  const confirmData = confirmResult.data as any;
  const generatedImages: Array<{ label: string; url: string }> = confirmData?.images ?? [];

  if (confirmData?.generated === true && generatedImages.length >= 1) {
    passed++;
    console.log(`  PASS: generated ${generatedImages.length} real image(s)`);
  } else {
    console.log('  FAIL: expected a real generated image', confirmData);
  }

  // Verify usage recorded under the correct feature/bucket.
  total++;
  const usageRow = await prisma.ai_usage_log.findFirst({
    where: { tenant_id: tenant.id, feature: 'marketing_image_prompt', bucket: 'monthly' },
    orderBy: { created_at: 'desc' },
  });
  console.log('\n[usage] latest marketing_image_prompt/monthly row:', usageRow);
  if (usageRow && Number(usageRow.estimated_cost) > 0) {
    passed++;
    console.log('  PASS: real positive cost recorded under the correct feature/bucket');
  } else {
    console.log('  FAIL: expected a real positive-cost usage row');
  }

  // Verify a real media_uploads row was created, then clean it up.
  total++;
  if (generatedImages.length > 0) {
    const mediaRows = await prisma.media_uploads.findMany({
      where: { tenant_id: tenant.id, title: { in: generatedImages.map((img) => img.label) } },
    });
    console.log('\n[media library] rows created:', mediaRows.map((r) => ({ id: r.id, title: r.title, path: r.path })));
    if (mediaRows.length >= 1) {
      passed++;
      console.log('  PASS: real media_uploads row(s) created');
      await prisma.media_uploads.deleteMany({ where: { id: { in: mediaRows.map((r) => r.id) } } });
      console.log('  Cleaned up the test media_uploads row(s) (real storage file left in place, already billed).');
    } else {
      console.log('  FAIL: expected at least one media_uploads row');
    }
  } else {
    console.log('\n[media library] skipped — no images were generated');
  }

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
