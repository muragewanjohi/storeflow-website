/**
 * Smoke test for the multi-turn conversation path (generateJsonFromConversation),
 * used by the Onboarding AI Chat (OC.1). Simulates a short back-and-forth to
 * confirm the "done" signal and structured collection actually work across
 * turns, not just in a single call. Mirrors test-claude-connection.ts.
 *
 * Usage: npm run test:claude-chat
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

  const system = [
    'You are a friendly onboarding assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    'Your only job in this conversation is to find out two things: businessType (a general category, e.g. "fashion", "electronics", "grocery") and niche (their specific focus within it, e.g. "women\'s handbags", "phone accessories", "organic produce").',
    'Ask one short, friendly question at a time. Do not ask about pricing, products, delivery, themes, or anything else — those come later in separate steps.',
    'Once you clearly have both businessType and niche, set done to true, fill in collected with both fields, and set reply to a short (max 2 sentences) friendly confirmation telling them their store is being set up.',
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
          businessType: { type: ['string', 'null'] },
          niche: { type: ['string', 'null'] },
        },
        required: ['businessType', 'niche'],
        additionalProperties: false,
      },
    },
    required: ['reply', 'done', 'collected'],
    additionalProperties: false,
  } as const;

  type Turn = { reply: string; done: boolean; collected: { businessType: string | null; niche: string | null } };

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: '(Start the onboarding conversation.)' },
  ];

  let totalCost = 0;
  let turnCount = 0;
  const scriptedReplies = [
    "I'm going to sell clothes.",
    'Specifically vintage denim jackets and accessories.',
  ];

  while (turnCount < 6) {
    turnCount++;
    console.log(`\n--- Turn ${turnCount}: calling Claude with ${messages.length} messages ---`);

    const { data, usage } = await generateJsonFromConversation<Turn>({
      system,
      messages,
      schema,
      maxTokens: 500,
    });

    totalCost += estimateCostUsd(usage);
    console.log(`Assistant: ${data.reply}`);
    console.log(`(done=${data.done}, collected=${JSON.stringify(data.collected)}, tokens=${usage.inputTokens}in/${usage.outputTokens}out)`);

    messages.push({ role: 'assistant', content: JSON.stringify(data) });

    if (data.done) {
      console.log(`\n✅ Conversation completed in ${turnCount} turn(s). Total estimated cost: $${totalCost.toFixed(6)}`);
      console.log(`Final collected: ${JSON.stringify(data.collected)}`);
      return;
    }

    const userReply = scriptedReplies[turnCount - 1] ?? 'I run a small shop, not sure how to describe it further.';
    console.log(`User: ${userReply}`);
    messages.push({ role: 'user', content: userReply });
  }

  console.log('\n⚠️  Conversation did not reach done:true within 6 turns — check the system prompt.');
}

main().catch((error) => {
  console.error('\n❌ Claude chat connection test failed:');
  console.error(error);
  process.exit(1);
});
