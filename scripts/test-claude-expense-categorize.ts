/**
 * Live smoke test for expense auto-categorization (AI Phase 2.1),
 * src/app/api/expenses/ai-categorize/route.ts. Mirrors the route's prompt/
 * schema rather than importing it (Next.js route files only allow
 * HTTP-method exports) — same pattern as the other test-claude-*.ts
 * scripts.
 *
 * Uses the real 7-category allow-list from
 * src/lib/finance/expense-categories.ts (every tenant checked via Supabase
 * MCP has exactly these 7 materialized, no custom ones yet — so this IS the
 * real production allow-list, not a fixture).
 *
 * Usage: npm run test:claude-expense-categorize
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  }

  const { generateJson, estimateCostUsd } = await import('../src/lib/ai/claude-client');
  const { defaultExpenseCategories } = await import('../src/lib/finance/expense-categories');

  const allowedNames = defaultExpenseCategories.map((c) => c.name);
  console.log(`Allow-list: ${allowedNames.join(', ')}`);

  const schema = {
    type: 'object',
    properties: { category: { type: 'string' } },
    required: ['category'],
    additionalProperties: false,
  } as const;

  function buildSystemPrompt(): string {
    return [
      'You are an expense-categorization assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
      "Given a merchant's free-text expense description (and optionally its amount in KES), pick the single best-fitting category.",
      `You must pick EXACTLY one of these category names, character-for-character: ${allowedNames.join(', ')}.`,
      'Never invent a category name that is not in this list. If nothing fits well, use "Miscellaneous".',
      'Return ONLY valid JSON with no markdown and no extra prose.',
    ].join(' ');
  }

  const cases: { description: string; amount?: number; expect: string }[] = [
    { description: 'Facebook and Instagram ads boost for the new sneaker collection', amount: 3500, expect: 'Ads & Marketing' },
    { description: 'Boxes, bubble wrap, and tape for shipping orders', amount: 1200, expect: 'Packaging' },
    { description: 'Monthly Canva Pro subscription', amount: 1500, expect: 'Software & Apps' },
    { description: 'Paid the part-time delivery rider for this week', amount: 4000, expect: 'Salaries & Contractors' },
    { description: 'Shop rent for August', amount: 25000, expect: 'Rent & Utilities' },
    { description: 'G4S courier fee to send stock from Nairobi to Mombasa', amount: 2800, expect: 'Shipping & Fulfillment' },
    { description: 'Bought a birthday cake for a staff member', amount: 1000, expect: 'Miscellaneous' },
  ];

  let totalCost = 0;
  let correct = 0;

  for (const c of cases) {
    const userContent = c.amount
      ? `Expense description: "${c.description}"\nAmount: KES ${c.amount}`
      : `Expense description: "${c.description}"`;

    const { data, usage } = await generateJson<{ category: string }>({
      system: buildSystemPrompt(),
      userContent,
      schema,
      maxTokens: 60,
    });

    const cost = estimateCostUsd(usage);
    totalCost += cost;
    const category = allowedNames.includes(data.category) ? data.category : 'Miscellaneous';
    const match = category === c.expect ? '✅' : '❌';
    if (category === c.expect) correct++;
    console.log(`${match} "${c.description}" -> ${category} (expected ${c.expect}) [$${cost.toFixed(6)}]`);
  }

  console.log(`\n${correct}/${cases.length} correct. Total estimated cost: $${totalCost.toFixed(6)}`);
  if (correct < cases.length) {
    console.log('⚠️  Not all cases matched expectation — review above before considering this fully verified.');
  }
}

main().catch((error) => {
  console.error('\n❌ Expense categorization test failed:');
  console.error(error);
  process.exit(1);
});
