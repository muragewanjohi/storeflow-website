/**
 * Live smoke test for the Dashboard AI Assistant's new 'homepage_image'
 * configuration_guidance target (@/lib/assistant/shared,
 * handleHomepageImageConfigTarget / DA.25's chat integration).
 *
 * Exercises the real classify prompt (buildConfigTargetSystemPrompt) against
 * real phrasings, checking the two never-cost-anything cases: an ambiguous
 * request (case 3, should ask which of the 5) and an unambiguous but
 * not-yet-confirmed request (case 2, should offer ONE slot back for
 * confirmation without regenerating). Case 1 (confirmed -> real regenerate)
 * is deliberately NOT re-exercised here — it's a thin wrapper directly over
 * regenerateHomepageImage(), already fully live-verified end-to-end by
 * test-homepage-images-regenerate.ts; running it again here would just
 * spend another ~$0.07 to re-prove the same code path.
 *
 * Usage: npm run test:homepage-images-assistant
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '2f0abc65-1d1e-4b0d-9dc3-783ff7a3873c'; // Electric Scooters, Basic plan

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { generateJsonFromConversation } = await import('../src/lib/ai/claude-client');
  const { prisma } = await import('../src/lib/prisma/client');
  const {
    configTargetSchema,
    buildConfigTargetSystemPrompt,
    resolveConfigTarget,
    handleHomepageImageConfigTarget,
    getBusinessProfile,
  } = await import('../src/lib/assistant/shared');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: { id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true, plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true, created_at: true, updated_at: true, country: true, data: true },
  });
  if (!tenant) throw new Error(`Test tenant ${TEST_TENANT_ID} not found`);
  const { businessType, niche } = getBusinessProfile(tenant as any);

  const cases: Array<{ label: string; message: string; expectTarget: string; expectProposed?: string; expectAmbiguous?: boolean }> = [
    { label: 'unambiguous hero request', message: 'Can you regenerate my hero image?', expectTarget: 'homepage_image', expectProposed: 'hero' },
    { label: 'unambiguous specific banner ("best sellers")', message: 'I want a new image for my best sellers banner', expectTarget: 'homepage_image', expectProposed: 'banner2' },
    { label: 'unambiguous split-layout', message: 'update my split layout image please', expectTarget: 'homepage_image', expectProposed: 'split_layout' },
    { label: 'ambiguous (which banner?)', message: 'I want to update my banner images', expectTarget: 'homepage_image', expectAmbiguous: true },
    { label: 'unrelated (should not misfire)', message: 'How do I add a new category?', expectTarget: 'category' },
  ];

  let passed = 0;
  for (const c of cases) {
    const { data } = await generateJsonFromConversation<any>({
      system: buildConfigTargetSystemPrompt(businessType, niche, []),
      messages: [{ role: 'user', content: c.message }],
      schema: configTargetSchema,
      maxTokens: 300,
    });
    const target = resolveConfigTarget(data.target);
    console.log(`\n[${c.label}] message="${c.message}"`);
    console.log('  parsed:', data);

    if (target !== c.expectTarget) {
      console.log(`  FAIL: expected target=${c.expectTarget}, got ${target}`);
      continue;
    }
    if (target !== 'homepage_image') {
      console.log('  PASS (correctly routed elsewhere, not homepage_image)');
      passed++;
      continue;
    }

    const result = await handleHomepageImageConfigTarget(tenant as any, data.imageSlot ?? '', data.proposedImageSlot ?? '');
    console.log('  handler answer:', result.answer);
    console.log('  handler data:', result.data);

    if (c.expectAmbiguous) {
      const ok = (result.data as any)?.options && !(result.data as any)?.proposed;
      console.log(ok ? '  PASS: asked which slot, nothing proposed/regenerated' : '  FAIL: expected an ambiguous "which one" response');
      if (ok) passed++;
      continue;
    }

    const proposed = (result.data as any)?.proposed;
    const regenerated = (result.data as any)?.regenerated;
    if (proposed === c.expectProposed && regenerated !== true) {
      console.log(`  PASS: proposed "${proposed}" for confirmation, did NOT regenerate (no cost incurred)`);
      passed++;
    } else {
      console.log(`  FAIL: expected proposed="${c.expectProposed}", regenerated=false; got proposed="${proposed}", regenerated=${regenerated}`);
    }
  }

  console.log(`\n${passed}/${cases.length} cases passed.`);
  await prisma.$disconnect();
  if (passed !== cases.length) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
