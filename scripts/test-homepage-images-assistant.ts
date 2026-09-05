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
 * Also covers the "regenerate ALL 5 at once" case added after a real user
 * report: the merchant was asked "which image would you like?", replied
 * "all of them", and the assistant just repeated the same question — it had
 * no way to represent "all 5" at all. The multi-turn case below reproduces
 * that exact real conversation shape (an ambiguous first turn, THEN "all of
 * them") rather than just testing an unambiguous single-turn "regenerate
 * all my images" phrasing, since the bug was specifically about the
 * follow-up turn, not first-mention classification. The real confirmed
 * regenerate-all path (imageSlot === 'all' -> regenerateAllHomepageImages)
 * is covered separately by test-homepage-images-regenerate-all.ts, same
 * cost-conscious split as the single-slot tests.
 *
 * Usage: npm run test:homepage-images-assistant
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// The "Electric Scooters" tenant this session's other live tests were
// pointed at (2f0abc65-...) no longer exists in the database as of this
// change — confirmed via a direct query, not assumed. Repointed at
// "testtwo" (a real, clearly test-labeled tenant, subdomain "testtwo",
// no plan) instead of guessing at a real merchant's account — safe here
// specifically because every case in this file only classifies + proposes
// (zero regeneration, zero DB writes, zero real cost beyond a few cheap
// Haiku classify calls); the costly live regenerate-all path is covered
// separately, deliberately NOT run against an unverified tenant — see
// test-homepage-images-regenerate-all.ts's own header.
const TEST_TENANT_ID = 'e401c99b-c078-4ab4-96f9-fc901f9110a9'; // testtwo, no plan

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

  type Case = {
    label: string;
    /** Prior turns before the final user message being tested — used for the multi-turn "all of them" repro below. */
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    message: string;
    expectTarget: string;
    expectProposed?: string;
    expectAmbiguous?: boolean;
    /** Classify-only check: expects data.imageSlot === 'all' (a real CONFIRM). Deliberately does NOT call the handler — that would trigger a real, costly regenerateAllHomepageImages() call, same "never re-prove case 1 here" discipline as the single-slot tests (see file docblock). */
    expectConfirmedAll?: boolean;
  };

  const cases: Case[] = [
    { label: 'unambiguous hero request', message: 'Can you regenerate my hero image?', expectTarget: 'homepage_image', expectProposed: 'hero' },
    { label: 'unambiguous specific banner ("best sellers")', message: 'I want a new image for my best sellers banner', expectTarget: 'homepage_image', expectProposed: 'banner2' },
    { label: 'unambiguous split-layout', message: 'update my split layout image please', expectTarget: 'homepage_image', expectProposed: 'split_layout' },
    { label: 'ambiguous (which banner?)', message: 'I want to update my banner images', expectTarget: 'homepage_image', expectAmbiguous: true },
    { label: 'unrelated (should not misfire)', message: 'How do I add a new category?', expectTarget: 'category' },
    {
      label: 'unambiguous single-turn "all of them"',
      message: 'Can you regenerate all of my homepage images?',
      expectTarget: 'homepage_image',
      expectProposed: 'all',
    },
    {
      label: 'REAL BUG REPRO: ambiguous turn, then "all of them"',
      history: [
        { role: 'user', content: 'I want to have my home page images have nice video game images' },
        {
          role: 'assistant',
          content: 'Sure — which image would you like me to regenerate? Your options are: Hero image, New Arrivals banner, Best Sellers banner, Special Offers banner, Split-layout image. Or just say "all of them" to regenerate all 5.',
        },
      ],
      message: 'all of them',
      expectTarget: 'homepage_image',
      expectProposed: 'all',
    },
    {
      label: 'REAL BUG REPRO, turn 3: confirming the "all" proposal with "yes"',
      history: [
        { role: 'user', content: 'I want to have my home page images have nice video game images' },
        {
          role: 'assistant',
          content: 'Sure — which image would you like me to regenerate? Your options are: Hero image, New Arrivals banner, Best Sellers banner, Special Offers banner, Split-layout image. Or just say "all of them" to regenerate all 5.',
        },
        { role: 'user', content: 'all of them' },
        {
          role: 'assistant',
          content: 'Want me to regenerate all 5 of your homepage images (Hero image, New Arrivals banner, Best Sellers banner, Special Offers banner, Split-layout image)? Just say the word.',
        },
      ],
      message: 'yes',
      expectTarget: 'homepage_image',
      // 'yes' here is a genuine CONFIRMATION (case 1), not another propose —
      // asserted separately below since it maps to imageSlot, not proposedImageSlot.
      expectConfirmedAll: true,
    },
  ];

  let passed = 0;
  for (const c of cases) {
    const messages = [...(c.history ?? []), { role: 'user' as const, content: c.message }];
    const { data } = await generateJsonFromConversation<any>({
      system: buildConfigTargetSystemPrompt(businessType, niche, []),
      messages,
      schema: configTargetSchema,
      maxTokens: 300,
    });
    const target = resolveConfigTarget(data.target);
    console.log(`\n[${c.label}] message="${c.message}"${c.history ? ` (with ${c.history.length}-message history)` : ''}`);
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

    if (c.expectConfirmedAll) {
      // Classify-only — never call the handler here, that would trigger a
      // real, costly regenerateAllHomepageImages() call.
      const ok = data.imageSlot === 'all';
      console.log(ok ? '  PASS: classified as a real confirm (imageSlot="all"), handler deliberately not invoked (real cost)' : `  FAIL: expected imageSlot="all", got imageSlot="${data.imageSlot}"`);
      if (ok) passed++;
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
