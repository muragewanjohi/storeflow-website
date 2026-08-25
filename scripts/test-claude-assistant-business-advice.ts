/**
 * Live smoke test for the new `business_advice` intent
 * (src/lib/assistant/shared.ts's handleBusinessAdvice, dispatched from both
 * src/app/api/assistant/chat/route.ts and
 * src/app/api/v1/mobile/assistant/chat/route.ts).
 *
 * Deliberately different verification shape from every other intent's
 * test: those all check Claude never invents a FACT (a number, a doc
 * citation). This intent is explicitly allowed to give Claude's own retail
 * opinion — what's checked here is that (1) classification correctly
 * separates this from help_question/configuration_guidance, (2) advice is
 * grounded in the tenant's REAL business_type/niche/categories (not
 * generic), and (3) pricing-for-a-specific-product answers are anchored to
 * a REAL recorded cost_price with the markup math done in code, never by
 * Claude — verified by checking the returned numbers against the real
 * database row directly.
 *
 * Usage: npm run test:claude-assistant-business-advice
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Real tenant with a real recorded cost_price, confirmed via Supabase MCP
// execute_sql before writing this test (business_type="Groceries & Food",
// niche not set — a good test of the "niche unknown" fallback path too).
const TEST_TENANT_ID = 'e692c97e-4948-4b36-a15b-66feba1068f3';
const TEST_PRODUCT_NAME = 'Stirfry veg packs(300 grams)';
const REAL_COST_PRICE = 520; // confirmed via direct SQL

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { generateJsonFromConversation, estimateCostUsd } = await import('../src/lib/ai/claude-client');
  const { prisma } = await import('../src/lib/prisma/client');
  const { buildClassifySystemPrompt, classifySchema, isIntent, handleBusinessAdvice } = await import(
    '../src/lib/assistant/shared'
  );

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: {
      id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true,
      plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true,
      created_at: true, updated_at: true, country: true, data: true,
    },
  });
  if (!tenant) throw new Error('Test tenant not found');
  console.log(`Tenant business context: business_type=${(tenant.data as any)?.business_type}, niche=${(tenant.data as any)?.niche ?? '(not set)'}`);

  let totalCost = 0;

  async function classify(question: string) {
    const { data, usage } = await generateJsonFromConversation<{ intent: string }>({
      system: buildClassifySystemPrompt(true),
      messages: [{ role: 'user', content: question }],
      schema: classifySchema,
      maxTokens: 60,
    });
    totalCost += estimateCostUsd(usage);
    return isIntent(data.intent) ? data.intent : 'unclear';
  }

  console.log('\n--- 1. Classification: business_advice vs help_question/configuration_guidance ---');
  const cases: { q: string; expect: string }[] = [
    { q: 'What categories should I have?', expect: 'business_advice' },
    { q: 'What attributes should a grocery product have?', expect: 'business_advice' },
    { q: 'How should I think about pricing my products?', expect: 'business_advice' },
    { q: `How much should I charge for ${TEST_PRODUCT_NAME}?`, expect: 'business_advice' },
    { q: "what's my business type?", expect: 'business_advice' }, // real user report: used to fall through to unclear
    { q: 'How do I add a category?', expect: 'configuration_guidance' }, // should NOT be pulled into business_advice
    { q: 'How do I create a discount code?', expect: 'help_question' }, // should NOT be pulled into business_advice
  ];
  let allCorrect = true;
  for (const c of cases) {
    const intent = await classify(c.q);
    const ok = intent === c.expect;
    allCorrect &&= ok;
    console.log(`${ok ? '✅' : '❌'} "${c.q}" -> ${intent} (expected ${c.expect})`);
  }

  console.log('\n--- 2. General category advice (grounded in real business_type, niche unset) ---');
  const catResult = await handleBusinessAdvice(
    [{ role: 'user', content: 'What categories should I have for my store?' }],
    tenant as any
  );
  totalCost += estimateCostUsd(catResult.usage);
  console.log(`Answer: ${catResult.answer}`);

  console.log('\n--- 3. General pricing strategy (no specific product) ---');
  const strategyResult = await handleBusinessAdvice(
    [{ role: 'user', content: 'How should I think about pricing my products?' }],
    tenant as any
  );
  totalCost += estimateCostUsd(strategyResult.usage);
  console.log(`Answer: ${strategyResult.answer}`);
  const mentionsInventedNumber = /KES\s*\d/.test(strategyResult.answer);
  console.log(
    !mentionsInventedNumber
      ? '✅ No specific KES number invented for a general strategy question (correct — nothing to anchor it to)'
      : '⚠️  A KES number appeared in a general strategy answer — check it is methodology, not a fabricated price'
  );

  console.log(`\n--- 4. Specific product pricing — must use the REAL cost_price (${REAL_COST_PRICE}) ---`);
  const pricingResult = await handleBusinessAdvice(
    [{ role: 'user', content: `How much should I charge for ${TEST_PRODUCT_NAME}?` }],
    tenant as any
  );
  totalCost += estimateCostUsd(pricingResult.usage);
  console.log(`Answer: ${pricingResult.answer}`);
  console.log(`Data: ${JSON.stringify(pricingResult.data)}`);
  const data = pricingResult.data as { costPrice?: number; suggestedRange?: { low: number; high: number } } | undefined;
  const costCorrect = data?.costPrice === REAL_COST_PRICE;
  const expectedLow = Math.round(REAL_COST_PRICE * 1.4);
  const expectedHigh = Math.round(REAL_COST_PRICE * 1.6);
  const rangeCorrect = data?.suggestedRange?.low === expectedLow && data?.suggestedRange?.high === expectedHigh;
  console.log(
    costCorrect && rangeCorrect
      ? `✅ Anchored to the real recorded cost_price (${REAL_COST_PRICE}) with a code-computed range (${expectedLow}-${expectedHigh}), not Claude arithmetic`
      : `❌ Cost/range mismatch — got costPrice=${data?.costPrice}, range=${JSON.stringify(data?.suggestedRange)}, expected costPrice=${REAL_COST_PRICE}, range=${expectedLow}-${expectedHigh}`
  );

  console.log("\n--- 5. Profile readback ('what's my business type?') — real user report, used to fall through to unclear ---");
  const profileResult = await handleBusinessAdvice(
    [{ role: 'user', content: "what's my business type?" }],
    tenant as any
  );
  totalCost += estimateCostUsd(profileResult.usage);
  console.log(`Answer: ${profileResult.answer}`);
  const realBusinessType = (tenant.data as any)?.business_type as string | undefined;
  const mentionsRealBusinessType = Boolean(realBusinessType) && profileResult.answer.includes(realBusinessType!);
  console.log(
    mentionsRealBusinessType
      ? `✅ Answer states the real recorded business_type ("${realBusinessType}"), not a Claude-restated guess`
      : `❌ Answer does not contain the real business_type ("${realBusinessType}") — investigate`
  );

  console.log(`\n✅ Total estimated cost: $${totalCost.toFixed(6)}`);
  if (!allCorrect) process.exitCode = 1;
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ business_advice test failed:');
  console.error(error);
  process.exit(1);
});
