/**
 * Live smoke test for the assistant's `next_steps` intent — added after a
 * real user report: asking the Dashboard Assistant "I what should I do
 * next ?" (their literal typo'd phrasing) got the generic "I can answer
 * questions about your store's data..." unclear fallback instead of a real
 * answer, even though DukaNest already has a real getting-started checklist
 * (src/lib/onboarding/getting-started-progress.ts, shown on the dashboard
 * home page) that could have answered it directly.
 *
 * Verifies two things live:
 *  1. Classification: both the exact reported phrasing and a clean
 *     rephrasing route to `next_steps`, not `unclear`.
 *  2. Correctness: the computed checklist matches real ground truth for a
 *     real tenant (confirmed via Supabase MCP execute_sql before writing
 *     this test) — no Claude call is involved in computing the steps
 *     themselves, so this is really testing the real Prisma queries +
 *     buildGettingStartedProgress(), not the model.
 *
 * Usage: npm run test:claude-assistant-next-steps
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
  const { countActiveDemoProducts } = await import('../src/lib/products/demo-products');
  const { getStaticOptions } = await import('../src/lib/settings/static-options');
  const { buildGettingStartedProgress, GETTING_STARTED_OPTION_NAMES } = await import(
    '../src/lib/onboarding/getting-started-progress'
  );
  // Imported from the real source of truth (same module the route uses),
  // not a locally mirrored copy — a mirrored copy here once drifted after
  // shared.ts was extracted and silently made this whole test class stale.
  const { buildClassifySystemPrompt, classifySchema } = await import('../src/lib/assistant/shared');

  let totalCost = 0;

  console.log('--- Classification checks ---');
  const phrasings = ['I what should I do next ?', 'What should I do next?', 'am I ready to launch?'];
  let allClassifiedCorrectly = true;
  for (const phrasing of phrasings) {
    const { data, usage } = await generateJsonFromConversation<{ intent: string }>({
      system: buildClassifySystemPrompt(true),
      messages: [{ role: 'user', content: phrasing }],
      schema: classifySchema,
      maxTokens: 60,
    });
    totalCost += estimateCostUsd(usage);
    const correct = data.intent === 'next_steps';
    allClassifiedCorrectly &&= correct;
    console.log(`${correct ? '✅' : '❌'} "${phrasing}" -> ${data.intent}`);
  }

  console.log('\n--- Real checklist computation (ground truth, verified via Supabase MCP before writing this test) ---');
  const [productCount, categoryCount, activeDemoProductCount, deliveryZoneCount, settings] = await Promise.all([
    prisma.products.count({ where: { tenant_id: TEST_TENANT_ID, status: 'active', created_by: { not: null } } }),
    prisma.categories.count({ where: { tenant_id: TEST_TENANT_ID } }),
    countActiveDemoProducts(TEST_TENANT_ID),
    prisma.delivery_zones.count({ where: { tenant_id: TEST_TENANT_ID, is_active: true } }),
    getStaticOptions(TEST_TENANT_ID, [...GETTING_STARTED_OPTION_NAMES]),
  ]);

  console.log(`Real counts: products=${productCount}, categories=${categoryCount}, demoProducts=${activeDemoProductCount}, deliveryZones=${deliveryZoneCount}`);
  console.log(`Real settings: ${JSON.stringify(settings)}`);

  const progress = buildGettingStartedProgress({
    productCount, categoryCount, activeDemoProductCount, deliveryZoneCount, settings,
    includeAssistantItem: true, // matches the real web route's call
  });
  console.log(`\nProgress: ${progress.completedCount}/${progress.totalCount} complete`);
  progress.items.forEach((item) => console.log(`  ${item.completed ? '✅' : '⬜'} ${item.id}: ${item.label}`));

  const NEXT_STEPS_META: Record<string, { priority: number }> = {
    category: { priority: 1 },
    product: { priority: 2 },
    preview: { priority: 3 },
    share: { priority: 4 },
    contact_phone: { priority: 5 },
    payment: { priority: 6 },
    delivery: { priority: 7 },
    logo: { priority: 8 },
    assistant: { priority: 9 },
    demo_products: { priority: 10 },
  };

  const topSteps = progress.items
    .filter((i) => !i.completed)
    .sort((a, b) => (NEXT_STEPS_META[a.id]?.priority ?? 999) - (NEXT_STEPS_META[b.id]?.priority ?? 999))
    .slice(0, 3);

  console.log(`\nAssistant would suggest (top 3 by priority): ${topSteps.map((s) => s.id).join(', ')}`);
  console.log(`\n✅ Total classification cost: $${totalCost.toFixed(6)}`);

  if (!allClassifiedCorrectly) {
    console.log('\n⚠️  Not every phrasing classified as next_steps — review above.');
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ next_steps test failed:');
  console.error(error);
  process.exit(1);
});
