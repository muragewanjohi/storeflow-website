/**
 * Live smoke test for configuration_guidance's REAL-ACTION path — the
 * merchant's explicit request that "the AI should also be able to create
 * them as previously, right now the only option is for the user to input
 * manually using the link provided" (docs/IMPLEMENTATION_TRACKER.md, DA.11).
 *
 * Covers all real-action handlers:
 *  1. handleCategoryConfigTarget() (@/lib/assistant/shared) — creates real
 *     categories when the merchant already named them in their message
 *     ("create the categories Care Gadgets and Smart Home"), shared
 *     verbatim by web and mobile. Cleans up what it creates.
 *  2. runProductIntakeTurn() (@/lib/products/ai-intake-shared) — the
 *     conversational product-intake core, now shared between
 *     POST /api/products/ai-intake (web) and
 *     POST /api/v1/mobile/products/ai-intake (mobile). Verifies the
 *     genuinely ambiguous case found via live testing: "I want to add 5 new
 *     electric shavers" must resolve to ONE listing with stockQuantity 5,
 *     never 5 separate listings, and must never invent a specific product
 *     name from a bare product type.
 *  3. The suggest-then-confirm category flow — found via a real screenshot:
 *     "help me create two categories for my store" (no names given) used to
 *     dead-end at a static pointer with no way to actually get categories
 *     created without leaving the chat. Verifies the full 2-turn exchange
 *     end to end: turn 1 proposes real, business-context-grounded names
 *     (never invented from nothing — grounded in the tenant's real
 *     business_type/niche, same discipline as business_advice) without
 *     creating anything yet; turn 2 ("yes, create those") resolves the
 *     SAME previously-suggested names via conversation history and creates
 *     them for real. Cleans up what it creates.
 *
 * This test does NOT call the HTTP routes (would need cookie/bearer auth
 * plumbing) — it calls the exact shared functions those routes call,
 * in-process, same pattern as test-claude-assistant-mobile.ts.
 *
 * Usage: npm run test:claude-assistant-config-actions
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = 'e401c99b-c078-4ab4-96f9-fc901f9110a9'; // "testtwo" — confirmed safe test tenant

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const {
    handleCategoryConfigTarget,
    getBusinessProfile,
    buildConfigTargetSystemPrompt,
    configTargetSchema,
    resolveConfigTarget,
    buildClassifySystemPrompt,
    classifySchema,
  } = await import('../src/lib/assistant/shared');
  const { runProductIntakeTurn } = await import('../src/lib/products/ai-intake-shared');
  const { generateSlug } = await import('../src/lib/products/validation');
  const { generateJsonFromConversation, estimateCostUsd } = await import('../src/lib/ai/claude-client');

  const tenant = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID } });
  if (!tenant) throw new Error('Test tenant not found');

  let totalCost = 0;
  let failures = 0;

  // -------------------------------------------------------------------
  // 1. Category creation
  // -------------------------------------------------------------------
  console.log('--- 1. handleCategoryConfigTarget: "create the categories Care Gadgets and Smart Home" ---');
  const beforeCount = await prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } });

  const result = await handleCategoryConfigTarget(
    tenant as any,
    ['Care Gadgets', 'Smart Home'],
    [],
    { href: '/dashboard/categories/new', cta: 'Add category' }
  );
  totalCost += estimateCostUsd(result.usage);
  console.log('answer:', result.answer);
  console.log('data:', result.data);

  const careGadgets = await prisma.categories.findFirst({ where: { tenant_id: TEST_TENANT_ID, slug: 'care-gadgets' } });
  const smartHome = await prisma.categories.findFirst({ where: { tenant_id: TEST_TENANT_ID, slug: 'smart-home' } });

  if (careGadgets && smartHome) {
    console.log('✅ Both categories genuinely created (confirmed via direct DB read)');
  } else {
    console.log('❌ One or both categories missing from DB — investigate');
    failures++;
  }

  // Clean up — restore the tenant's category count for other tests
  // (e.g. DA.5/DA.9's "8 categories" fixture assertions) that rely on it.
  await prisma.categories.deleteMany({ where: { tenant_id: TEST_TENANT_ID, slug: { in: ['care-gadgets', 'smart-home'] } } });
  const afterCount = await prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } });
  if (afterCount === beforeCount) {
    console.log(`✅ Cleaned up — category count restored to ${beforeCount}`);
  } else {
    console.log(`❌ Category count is ${afterCount}, expected ${beforeCount} after cleanup — investigate`);
    failures++;
  }

  // Re-running the same names should skip (already-exists path), not error.
  console.log('\n--- 1b. Re-creating the same name after it exists elsewhere should skip cleanly ---');
  await prisma.categories.create({ data: { tenant_id: TEST_TENANT_ID, name: 'Care Gadgets', slug: 'care-gadgets', status: 'active' } });
  const skipResult = await handleCategoryConfigTarget(tenant as any, ['Care Gadgets'], [], { href: '/dashboard/categories/new', cta: 'Add category' });
  totalCost += estimateCostUsd(skipResult.usage);
  console.log('answer:', skipResult.answer);
  const skipped = (skipResult.data as any)?.skippedExisting ?? [];
  if (skipped.includes('Care Gadgets')) {
    console.log('✅ Correctly reported as already existing, did not error or duplicate');
  } else {
    console.log('❌ Did not report the existing-category skip correctly — investigate');
    failures++;
  }
  await prisma.categories.deleteMany({ where: { tenant_id: TEST_TENANT_ID, slug: 'care-gadgets' } });

  // -------------------------------------------------------------------
  // 1c. Suggest-then-confirm flow: "help me create two categories for my
  // store" (no names given) — must propose real suggestions, then create
  // them for real once confirmed on the next turn.
  // -------------------------------------------------------------------
  console.log('\n--- 1c. Suggest-then-confirm: "help me create two categories for my store" ---');
  const { businessType, niche } = getBusinessProfile(tenant as any);
  console.log(`(tenant business context: businessType=${businessType}, niche=${niche})`);
  const beforeCount2 = await prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } });
  const existing = await prisma.categories.findMany({ where: { tenant_id: TEST_TENANT_ID, status: 'active' }, select: { name: true } });

  type Msg2 = { role: 'user' | 'assistant'; content: string };
  const configMessages: Msg2[] = [{ role: 'user', content: 'help me create two categories for my store' }];

  const targetTurn1 = await generateJsonFromConversation<{ target: string; categoryNames: string[]; suggestedCategoryNames: string[] }>({
    system: buildConfigTargetSystemPrompt(businessType, niche, existing.map((c) => c.name)),
    messages: configMessages,
    schema: configTargetSchema,
    maxTokens: 300,
  });
  totalCost += estimateCostUsd(targetTurn1.usage);
  console.log('target:', resolveConfigTarget(targetTurn1.data.target));
  console.log('categoryNames:', targetTurn1.data.categoryNames);
  console.log('suggestedCategoryNames:', targetTurn1.data.suggestedCategoryNames);

  if (resolveConfigTarget(targetTurn1.data.target) !== 'category' || targetTurn1.data.categoryNames.length > 0) {
    console.log('❌ Expected target=category with categoryNames empty on the first, un-named turn');
    failures++;
  } else if (targetTurn1.data.suggestedCategoryNames.length === 0) {
    console.log('❌ Expected real suggested category names to be proposed — got none');
    failures++;
  } else {
    console.log('✅ Proposed suggestions instead of inventing/creating anything yet');
  }

  const offerResult = await handleCategoryConfigTarget(tenant as any, [], targetTurn1.data.suggestedCategoryNames, {
    href: '/dashboard/categories/new',
    cta: 'Add category',
  });
  console.log('offer answer:', offerResult.answer);

  const countAfterOffer = await prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } });
  if (countAfterOffer !== beforeCount2) {
    console.log('❌ Category count changed after only an offer — nothing should be created yet');
    failures++;
  } else {
    console.log('✅ Nothing created yet — waiting for confirmation, as intended');
  }

  // Turn 2: merchant confirms with a bare "yes" — must resolve to the SAME
  // previously-suggested names via conversation history, and actually create.
  configMessages.push({ role: 'assistant', content: offerResult.answer });
  configMessages.push({ role: 'user', content: 'yes, create those' });

  const targetTurn2 = await generateJsonFromConversation<{ target: string; categoryNames: string[]; suggestedCategoryNames: string[] }>({
    system: buildConfigTargetSystemPrompt(businessType, niche, existing.map((c) => c.name)),
    messages: configMessages,
    schema: configTargetSchema,
    maxTokens: 300,
  });
  totalCost += estimateCostUsd(targetTurn2.usage);
  console.log('\nturn 2 target:', resolveConfigTarget(targetTurn2.data.target));
  console.log('turn 2 categoryNames:', targetTurn2.data.categoryNames);

  const confirmedNames = targetTurn2.data.categoryNames;
  const proposedLower = targetTurn1.data.suggestedCategoryNames.map((n) => n.toLowerCase());
  const namesMatchProposed =
    confirmedNames.length > 0 && confirmedNames.every((n) => proposedLower.includes(n.toLowerCase()));

  if (!namesMatchProposed) {
    console.log(`❌ Confirmation did not resolve to the previously-suggested names — got ${JSON.stringify(confirmedNames)}`);
    failures++;
  } else {
    console.log('✅ "Yes" correctly resolved to the exact previously-suggested names');
  }

  const createResult = await handleCategoryConfigTarget(tenant as any, confirmedNames, [], {
    href: '/dashboard/categories/new',
    cta: 'Add category',
  });
  console.log('create answer:', createResult.answer);

  const created = (createResult.data as any)?.created ?? [];
  const countAfterCreate = await prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } });
  if (created.length === confirmedNames.length && countAfterCreate === beforeCount2 + confirmedNames.length) {
    console.log(`✅ Confirmed categories genuinely created (${created.join(', ')}), verified via direct DB count`);
  } else {
    console.log('❌ Confirmed categories were not actually created — investigate');
    failures++;
  }

  // Clean up.
  const createdSlugs = created.map((n: string) => generateSlug(n));
  if (createdSlugs.length > 0) {
    await prisma.categories.deleteMany({ where: { tenant_id: TEST_TENANT_ID, slug: { in: createdSlugs } } });
  }
  const countAfterCleanup = await prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } });
  if (countAfterCleanup === beforeCount2) {
    console.log(`✅ Cleaned up — category count restored to ${beforeCount2}`);
  } else {
    console.log(`❌ Category count is ${countAfterCleanup}, expected ${beforeCount2} after cleanup — investigate`);
    failures++;
  }

  // -------------------------------------------------------------------
  // 2. Product intake — the ambiguous "5 new electric shavers" case
  // -------------------------------------------------------------------
  console.log('\n--- 2. runProductIntakeTurn: "I want to add 5 new electric shavers" (user\'s exact phrasing) ---');
  type Msg = { role: 'user' | 'assistant'; content: string };
  const messages: Msg[] = [{ role: 'user', content: 'I want to add 5 new electric shavers' }];

  const turn1 = await runProductIntakeTurn(TEST_TENANT_ID, messages);
  totalCost += estimateCostUsd(turn1.usage);
  console.log('reply:', turn1.data.reply);
  console.log('collected:', turn1.data.collected);
  if (turn1.data.collected.name !== null) {
    console.log(`❌ Should not invent a specific name from a bare product type — got "${turn1.data.collected.name}"`);
    failures++;
  } else {
    console.log('✅ Did not invent a specific product name');
  }

  messages.push({ role: 'assistant', content: turn1.data.reply });
  messages.push({ role: 'user', content: 'Call it "Philips HQ200 Electric Shaver", KES 1200 each' });

  const turn2 = await runProductIntakeTurn(TEST_TENANT_ID, messages);
  totalCost += estimateCostUsd(turn2.usage);
  console.log('\nreply:', turn2.data.reply);
  console.log('collected:', turn2.data.collected);

  let finalCollected = turn2.data.collected;
  if (!turn2.data.done) {
    messages.push({ role: 'assistant', content: turn2.data.reply });
    messages.push({ role: 'user', content: 'no SKU or category, that is all' });
    const turn3 = await runProductIntakeTurn(TEST_TENANT_ID, messages);
    totalCost += estimateCostUsd(turn3.usage);
    console.log('\nreply:', turn3.data.reply);
    console.log('done:', turn3.data.done);
    console.log('collected:', turn3.data.collected);
    finalCollected = turn3.data.collected;
    if (!turn3.data.done) {
      console.log('❌ Conversation did not converge to done:true within 3 turns — investigate');
      failures++;
    }
  }

  if (finalCollected.name && finalCollected.price === 1200 && finalCollected.stockQuantity === 5) {
    console.log('✅ Converged to ONE listing — name set, price=1200, stockQuantity=5 (never 5 separate listings)');
  } else {
    console.log(`❌ Final collected fields wrong: ${JSON.stringify(finalCollected)}`);
    failures++;
  }

  // -------------------------------------------------------------------
  // 4. REAL BUG REPRO (mobile screenshot): a vague "okay add them" reply
  //    to the assistant's own "here's what I can help set up" decline
  //    used to fall all the way to the generic unclearReply(), a jarring
  //    non-sequitur that ignored the menu it had just offered. Should now
  //    stay configuration_guidance so it gets a real chance to resolve
  //    (or re-offer the same real menu) instead.
  // -------------------------------------------------------------------
  console.log('\n--- 4. REAL BUG REPRO: vague "okay add them" after an unsupported-request decline ---');
  const reproMessages = [
    { role: 'user' as const, content: 'create the website for me' },
    {
      role: 'assistant' as const,
      content:
        "I can help you add a new product or category, regenerate one of your homepage images, generate a new marketing image, or set up a delivery zone right now. Guided setup for other things (like themes) isn't available from here yet — check the relevant Settings screen for that in the meantime.",
    },
    { role: 'user' as const, content: 'okay add them' },
  ];
  const { data: reproClassify, usage: reproUsage } = await generateJsonFromConversation<{ intent: string }>({
    system: buildClassifySystemPrompt(true),
    messages: reproMessages,
    schema: classifySchema,
    maxTokens: 60,
  });
  totalCost += estimateCostUsd(reproUsage);
  console.log('classified intent:', reproClassify.intent);
  if (reproClassify.intent === 'configuration_guidance') {
    console.log('✅ "okay add them" stayed configuration_guidance, not unclear');
  } else {
    console.log(`❌ Expected configuration_guidance, got "${reproClassify.intent}"`);
    failures++;
  }

  console.log(`\nTotal estimated cost: $${totalCost.toFixed(6)}`);
  if (failures > 0) {
    console.log(`\n❌ ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ All checks passed.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
