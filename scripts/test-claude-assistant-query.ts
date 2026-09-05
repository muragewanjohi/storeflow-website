/**
 * Live smoke test for the Dashboard AI Assistant's full web router
 * (src/app/api/assistant/chat/route.ts): intent classification, then
 * data_query (DA.1) / help_question (DA.2) / configuration_guidance (DA.3) /
 * next_steps dispatch.
 *
 * Imports the real classify prompt + handlers from @/lib/assistant/shared
 * (the same module the route itself uses) rather than maintaining a
 * separately mirrored copy — a mirrored copy is exactly what caused a false
 * negative here once already: after shared.ts was extracted, this script's
 * old hand-mirrored prompt silently drifted from the real one, and a test
 * run kept reporting a bug (the "add a product" dead end) as still present
 * after it had actually been fixed. Only `configuration_guidance`'s WEB
 * answer (the chat hand-off) is mirrored locally, since that part
 * genuinely differs per platform — see the shared module and route
 * docblocks for why.
 *
 * Exercises real data on both sides:
 *  - data_query: tenant e401c99b-c078-4ab4-96f9-fc901f9110a9, confirmed via
 *    Supabase MCP execute_sql to have real order history (56 units / 10
 *    orders, Feb 2026) — same tenant used for the original DA.1 test.
 *  - help_question: the real `user_guide_articles` table backing
 *    dukanest.com/help (48 active articles at last check) — no fixtures.
 *
 * Usage: npm run test:claude-assistant-query
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
    WEB_NEXT_STEPS_META,
  } = await import('../src/lib/assistant/shared');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: {
      id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true,
      plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true,
      created_at: true, updated_at: true, country: true, data: true,
    },
  });
  if (!tenant) throw new Error('Test tenant not found');

  let totalCost = 0;

  async function runTurn(question: string) {
    console.log(`\n=== "${question}" ===`);
    const messages = [{ role: 'user' as const, content: question }];

    const { data: classified, usage: classifyUsage } = await generateJsonFromConversation<{ intent: string }>({
      system: buildClassifySystemPrompt(true),
      messages,
      schema: classifySchema,
      maxTokens: 60,
    });
    totalCost += estimateCostUsd(classifyUsage);
    const intent = isIntent(classified.intent) ? classified.intent : 'unclear';
    console.log(`Classified intent: ${intent}`);

    if (intent === 'data_query') {
      const result = await handleDataQuery(messages, TEST_TENANT_ID);
      totalCost += estimateCostUsd(result.usage);
      console.log(`=> ${result.answer}`);
      return;
    }

    if (intent === 'help_question') {
      const result = await handleHelpQuestion(messages);
      totalCost += estimateCostUsd(result.usage);
      console.log(`=> ${result.answer}`);
      return;
    }

    if (intent === 'next_steps') {
      const result = await handleNextSteps(tenant as any, WEB_NEXT_STEPS_META, true);
      console.log(`=> ${result.answer}`);
      return;
    }

    if (intent === 'configuration_guidance') {
      const { data, usage } = await generateJsonFromConversation<{ target: string }>({
        system: buildConfigTargetSystemPrompt(null, null, []),
        messages,
        schema: configTargetSchema,
        maxTokens: 150,
      });
      totalCost += estimateCostUsd(usage);
      const target = resolveConfigTarget(data.target);
      if (target === 'product_intake') {
        console.log("=> Sure — let's add a new product together. (handoff -> POST /api/products/ai-intake)");
      } else {
        console.log('=> declined (unsupported target) — correct if the request really is outside product intake');
      }
      return;
    }

    console.log("=> I can answer questions about your store's data or help you understand DukaNest's features.");
  }

  const categories = await prisma.categories.findMany({ where: { tenant_id: TEST_TENANT_ID, status: 'active' }, select: { name: true } });
  console.log(`Test tenant categories: ${categories.map((c) => c.name).join(', ')}`);

  // data_query
  await runTurn('How many Kitchen Appliances have I sold this year?');
  await runTurn("What's my total revenue all time?");
  // help_question — real docs, should be answerable
  await runTurn('How do I create a sale or discount?');
  // configuration_guidance — the real reported bug: this used to be
  // help_question and decline (no article contains "add"); should now hand
  // off to product_intake instead of dead-ending.
  await runTurn('How do I add a new product?');
  // help_question — plausible gap probe, should decline rather than guess
  await runTurn('How do I set up two-factor authentication with Google Authenticator?');
  // configuration_guidance — supported target, direct request phrasing
  await runTurn('Can you help me add a new product to my store?');
  // configuration_guidance — unsupported target (Phase 7.1 not built yet)
  await runTurn('Walk me through setting up my delivery zones.');
  // next_steps
  await runTurn('What should I do next?');
  // unclear
  await runTurn('hello, how are you today?');

  console.log(`\n✅ Done. Total estimated cost: $${totalCost.toFixed(6)}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Assistant router test failed:');
  console.error(error);
  process.exit(1);
});
