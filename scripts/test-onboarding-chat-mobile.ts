/**
 * Live smoke test for OC.3 (Flutter Onboarding AI Chat) — verifies the
 * shared core (@/lib/onboarding/chat-shared) that both
 * POST /api/onboarding/chat (web) and POST /api/v1/mobile/onboarding/chat
 * (mobile, new) now import from, rather than each keeping its own copy.
 * Unlike test-claude-chat-known-business-type.ts (which pre-dates this
 * refactor and still has its own inline copy of the prompt), this test
 * calls the REAL exported functions the routes use — a real regression
 * check that the extraction didn't drift behavior for either platform.
 *
 * Part 1: withOnboardingChatKickoff — pure, zero cost.
 * Part 2: mergeBusinessContext — pure, zero cost. Confirms existing
 *   tenants.data keys (e.g. homepage_generic_images) survive a merge, and
 *   that an absent field is never written (matches both PATCH routes'
 *   .refine() + spread behavior).
 * Part 3: mobileSuccess/mobileError envelope shapes the new mobile routes
 *   wrap the shared core's output in — zero cost.
 * Part 4: one real, multi-turn Claude conversation through
 *   buildOnboardingChatSystemPrompt + onboardingChatResponseSchema with a
 *   knownBusinessType — the exact scenario test-claude-chat-known-business-type.ts
 *   covers, now run against the shared function itself.
 *
 * Usage: npm run test:onboarding-chat-mobile
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import type { OnboardingChatTurnResponse } from '../src/lib/onboarding/chat-shared';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');

  const {
    withOnboardingChatKickoff,
    mergeBusinessContext,
    buildOnboardingChatSystemPrompt,
    onboardingChatResponseSchema,
  } = await import('../src/lib/onboarding/chat-shared');
  const { mobileSuccess, mobileError } = await import('../src/lib/api/mobile-response');
  const { generateJsonFromConversation, estimateCostUsd } = await import('../src/lib/ai/claude-client');

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

  console.log('--- Part 1: withOnboardingChatKickoff ---');
  const kicked = withOnboardingChatKickoff([]);
  check('empty history gets a synthetic user kickoff', kicked.length === 1 && kicked[0].role === 'user', kicked);

  const untouched = withOnboardingChatKickoff([{ role: 'user', content: 'hello' }]);
  check('non-empty history passes through unchanged', untouched.length === 1 && untouched[0].content === 'hello', untouched);

  console.log('\n--- Part 2: mergeBusinessContext ---');
  const existing = { homepage_generic_images: true, business_type: 'fashion', other_key: 'keep-me' };
  const merged = mergeBusinessContext(existing, { niche: 'women\'s handbags' }) as Record<string, unknown>;
  check('preserves unrelated existing keys', merged.homepage_generic_images === true && merged.other_key === 'keep-me', merged);
  check('preserves business_type when only niche is given', merged.business_type === 'fashion', merged);
  check('writes the new niche', merged.niche === "women's handbags", merged);

  const mergedBoth = mergeBusinessContext(null, { businessType: 'electronics', niche: 'phone accessories' }) as Record<string, unknown>;
  check('handles null existing data (fresh tenant)', mergedBoth.business_type === 'electronics' && mergedBoth.niche === 'phone accessories', mergedBoth);

  const mergedNeither = mergeBusinessContext({ foo: 'bar' }, {}) as Record<string, unknown>;
  check('writes nothing new when input is empty', mergedNeither.foo === 'bar' && !('business_type' in mergedNeither) && !('niche' in mergedNeither), mergedNeither);

  console.log('\n--- Part 3: mobile envelope shapes ---');
  const successEnvelope = mobileSuccess({ reply: 'hi', done: false, collected: { businessType: null, niche: null } });
  const errorEnvelope = mobileError('VALIDATION_ERROR', 'bad input');
  check('mobileSuccess has success:true + data', successEnvelope.success === true && 'data' in successEnvelope, successEnvelope);
  check('mobileError has success:false + error.code', errorEnvelope.success === false && errorEnvelope.error.code === 'VALIDATION_ERROR', errorEnvelope);

  console.log('\n--- Part 4: real multi-turn Claude conversation via the shared system prompt ---');
  const knownBusinessType = 'Electronics';
  const storeName = 'CircuitHub';
  const messages: { role: 'user' | 'assistant'; content: string }[] = withOnboardingChatKickoff([]);
  const scriptedReplies = ['Phone repair parts and tools, mostly for small repair shops.'];
  let totalCost = 0;
  let turnCount = 0;
  let askedBusinessTypeAgain = false;
  let reachedDone = false;
  let finalCollected: OnboardingChatTurnResponse['collected'] | null = null;

  while (turnCount < 5 && !reachedDone) {
    turnCount++;
    const { data, usage } = await generateJsonFromConversation<OnboardingChatTurnResponse>({
      system: buildOnboardingChatSystemPrompt(storeName, knownBusinessType),
      messages,
      schema: onboardingChatResponseSchema,
      maxTokens: 500,
    });
    totalCost += estimateCostUsd(usage);
    console.log(`Turn ${turnCount} — Assistant: ${data.reply} (done=${data.done}, collected=${JSON.stringify(data.collected)})`);

    if (turnCount === 1 && /what.*(business|category|type|sell|selling)\b/i.test(data.reply) && !/niche|focus|specific/i.test(data.reply)) {
      askedBusinessTypeAgain = true;
    }

    // Same JSON-stringify-the-whole-turn quirk both platforms' clients use.
    messages.push({ role: 'assistant', content: JSON.stringify(data) });

    if (data.done) {
      reachedDone = true;
      finalCollected = data.collected;
      break;
    }

    const userReply = scriptedReplies[turnCount - 1] ?? 'that covers it';
    console.log(`Turn ${turnCount} — User: ${userReply}`);
    messages.push({ role: 'user', content: userReply });
  }

  check('reached done:true within 5 turns', reachedDone);
  check('did not re-ask for business type when knownBusinessType was given', !askedBusinessTypeAgain);
  check('businessType carried through unchanged', finalCollected?.businessType === knownBusinessType, finalCollected);
  check('niche was actually collected', typeof finalCollected?.niche === 'string' && finalCollected.niche.length > 0, finalCollected);

  console.log(`\nTotal estimated Claude cost this run: $${totalCost.toFixed(6)}`);
  console.log(`\n${passed}/${total} checks passed.`);
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nOnboarding chat mobile test failed:', error);
  process.exit(1);
});
