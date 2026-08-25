/**
 * Live smoke test for the mobile Dashboard AI Assistant route
 * (src/app/api/v1/mobile/assistant/chat/route.ts). Exercises the actual
 * shared logic it imports from @/lib/assistant/shared (the same module the
 * web route uses too), with particular attention to what's genuinely
 * NEW/different on mobile:
 *
 *  1. "How do I add a product?" — the exact phrasing from a real user's
 *     screenshot of the Flutter app, which used to decline with "I couldn't
 *     find anything in the DukaNest help center about that" (a dead end —
 *     help_question, no article literally contains "add"). Verifies it now
 *     classifies as configuration_guidance and resolves to product_intake
 *     (mobile hands this off to POST /api/v1/mobile/products/ai-intake for
 *     real creation — see test-claude-assistant-product-intake-mobile.ts for
 *     that live end-to-end flow).
 *  2. next_steps with MOBILE_NEXT_STEPS_META + includeAssistantItem:true —
 *     confirms mobile-appropriate hrefs, and (Flutter Phase 4, now that the
 *     assistant has a real center-tab entry point at /assistant) that the
 *     'assistant' checklist item DOES now appear, pointing at that real
 *     Flutter route.
 *  3. mobileSuccess()/mobileError() envelope shape — the actual thing that
 *     differs from the web route's raw response shape, and the reason
 *     Flutter's ApiResponse.fromJson requires this wrapping in the first
 *     place (a `success` field must always be present).
 *
 * Usage: npm run test:claude-assistant-mobile
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = 'e401c99b-c078-4ab4-96f9-fc901f9110a9';

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { generateJsonFromConversation, estimateCostUsd } = await import('../src/lib/ai/claude-client');
  const { prisma } = await import('../src/lib/prisma/client');
  const {
    buildClassifySystemPrompt,
    classifySchema,
    isIntent,
    handleDataQuery,
    handleHelpQuestion,
    handleNextSteps,
    configTargetSchema,
    buildConfigTargetSystemPrompt,
    resolveConfigTarget,
  } = await import('../src/lib/assistant/shared');
  const { mobileSuccess, mobileError } = await import('../src/lib/api/mobile-response');
  const { buildGettingStartedProgress, GETTING_STARTED_OPTION_NAMES } = await import('../src/lib/onboarding/getting-started-progress');
  const { getStaticOptions } = await import('../src/lib/settings/static-options');
  const { countActiveDemoProducts } = await import('../src/lib/products/demo-products');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: { id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true, plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true, created_at: true, updated_at: true, country: true, data: true },
  });
  if (!tenant) throw new Error('Test tenant not found');

  const MOBILE_NEXT_STEPS_META: Record<string, { hrefTemplate: (storeUrl: string) => string; cta: string; priority: number }> = {
    category: { hrefTemplate: () => '/categories', cta: 'Add category', priority: 1 },
    product: { hrefTemplate: () => '/products', cta: 'Add product', priority: 2 },
    preview: { hrefTemplate: (s) => s, cta: 'Preview store', priority: 3 },
    share: { hrefTemplate: (s) => s, cta: 'Copy link', priority: 4 },
    contact_phone: { hrefTemplate: () => '/settings', cta: 'Add phone', priority: 5 },
    payment: { hrefTemplate: () => '/payment-settings', cta: 'Set up payments', priority: 6 },
    delivery: { hrefTemplate: () => '/shipping-delivery', cta: 'Configure shipping', priority: 7 },
    logo: { hrefTemplate: () => '/settings', cta: 'Add logo', priority: 8 },
    assistant: { hrefTemplate: () => '/assistant', cta: 'Try it', priority: 9 },
    demo_products: { hrefTemplate: () => '/products', cta: 'Remove demo products', priority: 10 },
  };

  let totalCost = 0;

  console.log('--- 1. "How do I add a product?" no longer dead-ends ---');
  for (const configTestMessage of ['How do I add a product?', 'Can you help me add a new product to my store?']) {
    const { data: classified, usage: classifyUsage } = await generateJsonFromConversation<{ intent: string }>({
      system: buildClassifySystemPrompt(true),
      messages: [{ role: 'user', content: configTestMessage }],
      schema: classifySchema,
      maxTokens: 60,
    });
    totalCost += estimateCostUsd(classifyUsage);
    const rawIntent = isIntent(classified.intent) ? classified.intent : 'unclear';
    console.log(`"${configTestMessage}" -> ${rawIntent}`);

    if (rawIntent !== 'configuration_guidance') {
      console.log(`❌ Did not route to configuration_guidance — got ${rawIntent} instead. Investigate.`);
      continue;
    }

    const { data: targetData, usage: targetUsage } = await generateJsonFromConversation<{ target: string }>({
      system: buildConfigTargetSystemPrompt(null, null, []),
      messages: [{ role: 'user', content: configTestMessage }],
      schema: configTargetSchema,
      maxTokens: 150,
    });
    totalCost += estimateCostUsd(targetUsage);
    const target = resolveConfigTarget(targetData.target);
    console.log(`  target -> ${target}`);
    console.log(
      target === 'product_intake'
        ? '✅ Resolved to product_intake — mobile now hands off to POST /api/v1/mobile/products/ai-intake (real creation) instead of declining'
        : `❌ Resolved to "${target}" instead of product_intake — investigate`
    );
  }

  console.log('\n--- 2. next_steps with mobile nav meta + includeAssistantItem:true (Phase 4) ---');
  const nextStepsResult = await handleNextSteps(tenant as any, MOBILE_NEXT_STEPS_META, true);
  console.log(`Answer: ${nextStepsResult.answer}`);
  const stepsData = nextStepsResult.data as { steps: { id: string; href: string }[] } | undefined;
  // Not asserting it's IN the top-3 suggested steps (this tenant likely has
  // higher-priority incomplete items) — just confirming the underlying
  // progress computation now includes it and, if surfaced, points somewhere
  // real.
  const assistantStep = stepsData?.steps?.find((s) => s.id === 'assistant');
  if (assistantStep) {
    console.log(
      assistantStep.href === '/assistant'
        ? `✅ 'assistant' step surfaced with the real Flutter route: ${assistantStep.href}`
        : `❌ 'assistant' step surfaced but with unexpected href: ${assistantStep.href}`
    );
  } else {
    console.log("ℹ️  'assistant' step not in this tenant's top-3 suggestions this run (expected if other items rank higher) — top-3 shown below.");
  }
  stepsData?.steps?.forEach((s) => console.log(`  - ${s.id} -> ${s.href}`));

  console.log("\n--- 2b. Direct check: 'assistant' item + href, independent of top-3 truncation ---");
  const [productCount, categoryCount, activeDemoProductCount, deliveryZoneCount, settings] = await Promise.all([
    prisma.products.count({ where: { tenant_id: TEST_TENANT_ID, status: 'active', created_by: { not: null } } }),
    prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } }),
    countActiveDemoProducts(TEST_TENANT_ID),
    prisma.delivery_zones.count({ where: { tenant_id: TEST_TENANT_ID, is_active: true } }),
    getStaticOptions(TEST_TENANT_ID, [...GETTING_STARTED_OPTION_NAMES]),
  ]);
  const rawProgress = buildGettingStartedProgress({
    productCount, categoryCount, activeDemoProductCount, deliveryZoneCount, settings,
    includeAssistantItem: true,
  });
  const assistantItem = rawProgress.items.find((i) => i.id === 'assistant');
  const resolvedHref = MOBILE_NEXT_STEPS_META.assistant?.hrefTemplate('');
  console.log(
    assistantItem && resolvedHref === '/assistant'
      ? `✅ 'assistant' item present in raw progress (completed=${assistantItem.completed}), resolves to the real Flutter route '/assistant'`
      : "❌ 'assistant' item missing from raw progress or resolves to an unexpected href — investigate"
  );

  console.log('\n--- 3. data_query + help_question still work when imported from the shared module ---');
  const dqResult = await handleDataQuery([{ role: 'user', content: 'How many Kitchen Appliances have I sold this year?' }], TEST_TENANT_ID);
  totalCost += estimateCostUsd(dqResult.usage);
  console.log(`data_query: ${dqResult.answer}`);

  const hqResult = await handleHelpQuestion([{ role: 'user', content: 'How do I create a sale or discount?' }]);
  totalCost += estimateCostUsd(hqResult.usage);
  console.log(`help_question: ${hqResult.answer.slice(0, 80)}...`);

  console.log('\n--- 4. Mobile envelope shape ---');
  const successEnvelope = mobileSuccess({ intent: 'data_query', answer: 'test' });
  const errorEnvelope = mobileError('RATE_LIMITED', 'Too many requests.');
  console.log('Success:', JSON.stringify(successEnvelope));
  console.log('Error:', JSON.stringify(errorEnvelope));
  const successOk = successEnvelope.success === true && 'data' in successEnvelope;
  const errorOk = errorEnvelope.success === false && errorEnvelope.error.code === 'RATE_LIMITED';
  console.log(successOk && errorOk ? '✅ Envelope shapes match what ApiResponse.fromJson expects (success field always present)' : '❌ Envelope shape mismatch');

  console.log(`\n✅ Total estimated cost: $${totalCost.toFixed(6)}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Mobile assistant test failed:');
  console.error(error);
  process.exit(1);
});
