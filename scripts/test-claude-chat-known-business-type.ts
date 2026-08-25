/**
 * Live smoke test for the `knownBusinessType` path added to
 * POST /api/onboarding/chat for OC.2 — verifies the assistant skips
 * re-asking businessType when it's already known (from the real /register
 * dropdown, via tenants.data.business_type) and focuses only on niche.
 * Mirrors test-claude-chat-connection.ts's pattern for the new branch.
 *
 * Usage: npm run test:claude-chat-known-business-type
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  }

  const { generateJsonFromConversation, estimateCostUsd } = await import('../src/lib/ai/claude-client');

  const knownBusinessType = 'Electronics';
  const storeName = 'CircuitHub';

  function buildSystemPrompt(): string {
    return [
      'You are a friendly onboarding assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
      `You already know the merchant's businessType: "${knownBusinessType}". Do not ask for it again — you may confirm it naturally in your first message, but your only real job now is finding out their niche (their specific focus within it, e.g. "women's handbags", "phone accessories", "organic produce"). Always return businessType as exactly "${knownBusinessType}" in collected.`,
      'Ask one short, friendly question at a time. Do not ask about pricing, products, delivery, themes, or anything else — those come later in separate steps.',
      `The merchant's store is already named "${storeName}" — do not ask for it, you may reference it naturally.`,
      'Once you clearly have niche, set done to true, fill in collected (businessType as given above, niche as discovered), and set reply to a short (max 2 sentences) friendly confirmation.',
      'Until then, set done to false and leave collected fields null for whatever you do not have yet.',
      'Keep every reply under 3 sentences. Return ONLY valid JSON with no markdown and no extra prose.',
    ].join(' ');
  }

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
  const scriptedReplies = ['Phone repair parts and tools, mostly for small repair shops.'];

  let totalCost = 0;
  let turnCount = 0;
  let askedBusinessTypeAgain = false;

  while (turnCount < 5) {
    turnCount++;
    const { data, usage } = await generateJsonFromConversation<Turn>({
      system: buildSystemPrompt(),
      messages,
      schema,
      maxTokens: 500,
    });
    totalCost += estimateCostUsd(usage);
    console.log(`\n--- Turn ${turnCount} ---`);
    console.log(`Assistant: ${data.reply}`);
    console.log(`(done=${data.done}, collected=${JSON.stringify(data.collected)})`);

    if (/what.*(business|category|type|sell|selling)\b/i.test(data.reply) && turnCount === 1 && !/niche|focus|specific/i.test(data.reply)) {
      askedBusinessTypeAgain = true;
    }

    messages.push({ role: 'assistant', content: JSON.stringify(data) });

    if (data.done) {
      console.log(`\n✅ Completed in ${turnCount} turn(s). Total estimated cost: $${totalCost.toFixed(6)}`);
      console.log(`Final collected: ${JSON.stringify(data.collected)}`);
      const businessTypeCorrect = data.collected.businessType === knownBusinessType;
      console.log(
        businessTypeCorrect
          ? `✅ businessType correctly carried through as "${knownBusinessType}" without re-asking.`
          : `⚠️  businessType mismatch: expected "${knownBusinessType}", got "${data.collected.businessType}".`
      );
      console.log(askedBusinessTypeAgain ? '⚠️  First message looked like it re-asked for business type.' : '✅ Did not re-ask for business type.');
      return;
    }

    const userReply = scriptedReplies[turnCount - 1] ?? 'that covers it';
    console.log(`User: ${userReply}`);
    messages.push({ role: 'user', content: userReply });
  }

  console.log('\n⚠️  Did not reach done:true within 5 turns.');
}

main().catch((error) => {
  console.error('\n❌ Known-business-type onboarding chat test failed:');
  console.error(error);
  process.exit(1);
});
