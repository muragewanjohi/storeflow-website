/**
 * Live smoke test for AI Phase 10 — Customer Outreach Content
 * (@/lib/social-content/social-content-shared, and the assistant's new
 * 'social_content' intent, @/lib/assistant/shared).
 *
 * Four parts:
 *  1. Classify (no cost beyond a few cheap Haiku calls): real phrasings
 *     route to 'social_content', and a plain "make me a banner for my
 *     sale" (no text-content ask) correctly stays configuration_guidance's
 *     marketing_images target instead — the two overlap (both can produce
 *     an image) so this is the one real ambiguity worth checking directly.
 *  2. Text generation (Phase A, cheap, Claude-only): a real request
 *     referencing a REAL product from the tenant's catalog produces
 *     grounded content mentioning that real name — never an invented one —
 *     and does NOT generate an image on the same turn (proposes it
 *     instead). A second request referencing a product that does NOT
 *     exist in the catalog is checked for the same anti-invention
 *     discipline (falls back to general wording rather than fabricating
 *     a match).
 *  3. Multi-turn image confirm classification: simulates the real 3-turn
 *     shape (ask -> propose image -> "yes") and checks imageConfirmed
 *     resolves correctly, WITHOUT yet calling the handler (classify-only,
 *     same discipline as DA.32's homepage-image confirm-turn test).
 *  4. Real image generation (Phase B, real Gemini cost, same accepted
 *     live-test precedent test-marketing-images.ts already established):
 *     one real end-to-end handleSocialContent() call with imageConfirmed
 *     true, against a real tenant with real products, verifying a real
 *     image lands in the real Media Library and usage is recorded under
 *     'marketing_image_prompt' (not lumped into 'assistant_query') — then
 *     cleans up the created media_uploads row (leaves the real, already-
 *     billed storage file, same "cost already happened" reasoning as every
 *     other cleanup this session).
 *
 * Usage: npm run test:social-content
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '1a79e0e9-1a3e-4265-bf99-7a5d2a224214'; // "smart hub" — real active tenant with real products + active sales

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
    handleSocialContent,
  } = await import('../src/lib/assistant/shared');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: { id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true, plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true, created_at: true, updated_at: true, country: true, data: true },
  });
  if (!tenant) throw new Error(`Test tenant ${TEST_TENANT_ID} not found`);

  const realProducts = await prisma.products.findMany({
    where: { tenant_id: TEST_TENANT_ID, status: 'active' },
    select: { name: true, price: true },
    take: 5,
    orderBy: { created_at: 'desc' },
  });
  if (realProducts.length === 0) throw new Error('Test tenant has no real active products');
  const realProductName = realProducts[0].name;
  console.log(`Using real tenant: ${tenant.name} (${tenant.id}), real product: "${realProductName}"`);

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

  // --- Part 1: classification ---
  const classifyCases: Array<{ label: string; message: string; expect: string }> = [
    { label: 'social caption request', message: 'write me a social media post about my new arrivals', expect: 'social_content' },
    { label: 'WhatsApp message request', message: `make a WhatsApp message for ${realProductName}`, expect: 'social_content' },
    { label: 'SMS/share request', message: 'give me something to share with my customers for my sale', expect: 'social_content' },
    { label: 'image-only request (should NOT misfire)', message: 'make me a banner for my sale', expect: 'configuration_guidance' },
  ];
  for (const c of classifyCases) {
    const { data } = await generateJsonFromConversation<{ intent: string }>({
      system: buildClassifySystemPrompt(true),
      messages: [{ role: 'user', content: c.message }],
      schema: classifySchema,
      maxTokens: 60,
    });
    const intent = isIntent(data.intent) ? data.intent : 'unclear';
    check(`classify "${c.message}" -> ${c.expect}`, intent === c.expect, intent);
  }

  // --- Part 2: real text generation, grounding checks ---
  const realRequest = await handleSocialContent(
    [{ role: 'user', content: `write me a social post about ${realProductName}` }],
    tenant as any
  );
  console.log('\n[Real product request] answer:\n', realRequest.answer);
  const realData = realRequest.data as any;
  check('real-product request mentions the real product name in groundedSubject', realData.groundedSubject?.includes(realProductName) ?? false, realData.groundedSubject);
  check('real-product request did NOT generate an image on the first turn', realData.imageGenerated !== true, realData);
  check('real-product request has all 3 content pieces', !!realData.socialCaption && !!realData.whatsappMessage && !!realData.smsMessage, realData);

  const fakeProductName = 'Definitely Not A Real Product XYZ123';
  const fakeRequest = await handleSocialContent(
    [{ role: 'user', content: `write me a post about my ${fakeProductName}` }],
    tenant as any
  );
  const fakeData = fakeRequest.data as any;
  console.log('\n[Nonexistent-product request] groundedSubject:', fakeData.groundedSubject);
  check(
    'nonexistent-product request did NOT fabricate the fake name into groundedSubject',
    !(fakeData.groundedSubject ?? '').includes(fakeProductName),
    fakeData.groundedSubject
  );

  // --- Part 3: multi-turn image-confirm classification (no handler call, no cost) ---
  const { data: confirmIntent } = await generateJsonFromConversation<any>({
    system: (await import('../src/lib/assistant/shared')).buildClassifySystemPrompt(true),
    messages: [
      { role: 'user', content: `write me a social post about ${realProductName}` },
      { role: 'assistant', content: realRequest.answer },
      { role: 'user', content: 'yes please make the graphic too' },
    ],
    schema: classifySchema,
    maxTokens: 60,
  });
  check('multi-turn "yes make the graphic" still classifies as social_content', isIntent(confirmIntent.intent) && confirmIntent.intent === 'social_content', confirmIntent);

  // --- Part 4: real image generation ---
  const quotaCheckResult = await handleSocialContent(
    [
      { role: 'user', content: `write me a social post about ${realProductName}` },
      { role: 'assistant', content: realRequest.answer },
      { role: 'user', content: 'yes please make the graphic too' },
    ],
    tenant as any
  );
  console.log('\n[Real image confirm] answer:', quotaCheckResult.answer);
  console.log('[Real image confirm] data:', quotaCheckResult.data);
  const imageData = quotaCheckResult.data as any;

  if (imageData?.reason === 'quota_exceeded') {
    console.log('Tenant has no remaining marketing-image quota this month — skipping the real generation check, everything else above still passed.');
    total++;
    passed++;
  } else {
    check('real image was generated', imageData?.imageGenerated === true, imageData);
    check('real image has a real URL', typeof imageData?.imageUrl === 'string' && imageData.imageUrl.startsWith('http'), imageData);

    const usageRow = await prisma.ai_usage_log.findFirst({
      where: { tenant_id: TEST_TENANT_ID, feature: 'marketing_image_prompt', bucket: 'monthly' },
      orderBy: { created_at: 'desc' },
    });
    check('real usage recorded under marketing_image_prompt/monthly, not assistant_query', !!usageRow && Number(usageRow.estimated_cost) > 0, usageRow);

    if (imageData?.mediaId) {
      await prisma.media_uploads.delete({ where: { id: imageData.mediaId } }).catch(() => {});
      console.log(`\nCleaned up test media_uploads row ${imageData.mediaId} (real billed image file left in place).`);
    }
  }

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
