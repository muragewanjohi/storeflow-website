/**
 * Smoke test for the Claude (Anthropic) integration.
 *
 * Calls generateJson() directly — bypassing the Next.js route/auth/tenant
 * layer — to verify the API key works, the model name resolves, and
 * structured JSON output behaves as expected, without needing a logged-in
 * tenant session. Mirrors the pattern in test-tumizi-connection.ts.
 *
 * Usage: npm run test:claude
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  }

  // Imported after dotenv.config() so claude-client.ts sees the env var
  const { generateJson, estimateCostUsd } = await import('../src/lib/ai/claude-client');

  console.log('Calling Claude (claude-haiku-4-5) with a sample product...\n');

  const { data, usage } = await generateJson<{ description: string; short_description: string }>({
    system: [
      'You are an ecommerce copywriter for DukaNest, a Kenyan multi-tenant storefront platform.',
      'Return ONLY valid JSON with no markdown and no extra prose.',
      'Write a compelling product description (80-120 words) and a short_description (max 160 characters, suitable for search/listing previews).',
      'Be specific to the product given — do not use generic filler like "great quality" without justification.',
      'Do not invent features, materials, or specifications not implied by the product name, category, or price.',
    ].join(' '),
    userContent: 'Product name: "Ankara Print Tote Bag".\nCategory: Fashion Accessories.\nPrice: KES 1500.',
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        short_description: { type: 'string' },
      },
      required: ['description', 'short_description'],
      additionalProperties: false,
    },
    maxTokens: 500,
  });

  const cost = estimateCostUsd(usage);

  console.log('--- Generated description ---');
  console.log(data.description);
  console.log('\n--- Short description ---');
  console.log(data.short_description);
  console.log('\n--- Usage ---');
  console.log(`Input tokens:  ${usage.inputTokens}`);
  console.log(`Output tokens: ${usage.outputTokens}`);
  console.log(`Estimated cost: $${cost.toFixed(6)}`);
  console.log('\n✅ Claude connection working.');
}

main().catch((error) => {
  console.error('\n❌ Claude connection test failed:');
  console.error(error);
  process.exit(1);
});
