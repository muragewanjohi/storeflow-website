/**
 * Smoke test for the product-intake conversation (AI Phase 1.1), using a
 * fake category list to simulate what the real route fetches from Prisma.
 * Bypasses the HTTP/auth/tenant layer, same pattern as
 * test-claude-chat-connection.ts.
 *
 * Usage: npm run test:claude-product-intake
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  }

  const { generateJsonFromConversation, estimateCostUsd } = await import(
    '../src/lib/ai/claude-client'
  );

  const fakeCategories = ['Fashion', 'Electronics', 'Home & Kitchen'];
  const categoryList = `The merchant's existing categories are: ${fakeCategories.join(', ')}. If the product clearly fits one of these, use that exact name for "category". If none fit well, or there are no existing categories, set category to null — do not invent a category name that isn't in this list.`;

  const system = [
    'You are a product-intake assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    'Your job is to collect enough information to create one product listing: name, price (in KES), and optionally stock quantity, category, and SKU.',
    'Ask for name and price first — these are required. Ask one short, friendly question at a time.',
    'Once you have name and price, ask once whether they want to specify stock quantity, category, or SKU now, or skip and set them later. Do not insist — one offer is enough.',
    categoryList,
    'SKU is optional — if they do not have one, leave it null; the system generates one automatically.',
    'Once you have name and price (and have given them the one chance to add stock/category/SKU), set done to true, fill in collected with whatever you have (nulls for anything skipped), and reply with a short (max 2 sentences) confirmation.',
    'Until then, set done to false and leave collected fields null for whatever you do not have yet.',
    'Keep every reply under 3 sentences. Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');

  const schema = {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      done: { type: 'boolean' },
      collected: {
        type: 'object',
        properties: {
          name: { type: ['string', 'null'] },
          price: { type: ['number', 'null'] },
          stockQuantity: { type: ['number', 'null'] },
          category: { type: ['string', 'null'] },
          sku: { type: ['string', 'null'] },
        },
        required: ['name', 'price', 'stockQuantity', 'category', 'sku'],
        additionalProperties: false,
      },
    },
    required: ['reply', 'done', 'collected'],
    additionalProperties: false,
  } as const;

  type Turn = {
    reply: string;
    done: boolean;
    collected: {
      name: string | null;
      price: number | null;
      stockQuantity: number | null;
      category: string | null;
      sku: string | null;
    };
  };

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: '(Start the product intake conversation.)' },
  ];

  const scriptedReplies = [
    'Leather ankle boots, 3500 shillings.',
    "I've got 12 in stock, and yeah put it under Fashion.",
    'no sku, skip it',
  ];

  let totalCost = 0;
  let turnCount = 0;

  while (turnCount < 8) {
    turnCount++;
    console.log(`\n--- Turn ${turnCount} ---`);

    const { data, usage } = await generateJsonFromConversation<Turn>({
      system,
      messages,
      schema,
      maxTokens: 500,
    });

    totalCost += estimateCostUsd(usage);
    console.log(`Assistant: ${data.reply}`);
    console.log(`(done=${data.done}, collected=${JSON.stringify(data.collected)})`);

    messages.push({ role: 'assistant', content: JSON.stringify(data) });

    if (data.done) {
      console.log(`\n✅ Completed in ${turnCount} turn(s). Total estimated cost: $${totalCost.toFixed(6)}`);
      console.log(`Final collected: ${JSON.stringify(data.collected, null, 2)}`);
      return;
    }

    const userReply = scriptedReplies[turnCount - 1] ?? 'skip the rest, that is all';
    console.log(`User: ${userReply}`);
    messages.push({ role: 'user', content: userReply });
  }

  console.log('\n⚠️  Did not reach done:true within 8 turns.');
}

main().catch((error) => {
  console.error('\n❌ Product intake test failed:');
  console.error(error);
  process.exit(1);
});
