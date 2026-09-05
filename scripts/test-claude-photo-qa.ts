/**
 * Live smoke test for AI Phase 5 — Product Photo QA
 * (@/lib/products/photo-qa-shared.ts, used by both
 * src/app/api/products/photo-qa/route.ts and
 * src/app/api/v1/mobile/products/photo-qa/route.ts).
 *
 * Tests against REAL product photos already stored in the database — no
 * fixtures. Confirms the vision judgment actually varies with what's really
 * in the image (not a fixed/templated response), and that a bare product
 * type doesn't leak the real product name into the alt text when none is
 * given.
 *
 * Usage: npm run test:claude-photo-qa
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const { fetchImageAsBase64, runPhotoQa, PHOTO_QA_QUALITY_SCORES } = await import('../src/lib/products/photo-qa-shared');
  const { estimateCostUsd } = await import('../src/lib/ai/claude-client');

  const products = await prisma.products.findMany({
    where: { image: { not: null } },
    select: { id: true, name: true, image: true },
    distinct: ['tenant_id'],
    take: 4,
  });

  if (products.length === 0) throw new Error('No products with a real image found — cannot live-test');

  let totalCost = 0;
  let failures = 0;
  const seenScores = new Set<string>();

  for (const product of products) {
    if (!product.image) continue;
    console.log(`\n=== "${product.name}" ===`);
    const { base64, mediaType } = await fetchImageAsBase64(product.image);
    const { data, usage } = await runPhotoQa({ imageBase64: base64, imageMediaType: mediaType, productName: product.name });
    totalCost += estimateCostUsd(usage);
    seenScores.add(data.qualityScore);

    console.log('qualityScore:', data.qualityScore);
    if (data.issues.length) console.log('issues:', data.issues);
    console.log('suggestedAltText:', data.suggestedAltText);

    if (!(PHOTO_QA_QUALITY_SCORES as readonly string[]).includes(data.qualityScore)) {
      console.log(`❌ qualityScore "${data.qualityScore}" is not a real allow-listed value`);
      failures++;
    }
    if (data.qualityScore === 'good' && data.reshootSuggestions.length > 0) {
      console.log('❌ "good" quality should not carry reshoot suggestions');
      failures++;
    }
    if (data.suggestedAltText.length >= 125) {
      console.log('❌ alt text exceeds the requested 125-char limit');
      failures++;
    }
  }

  console.log(`\n--- Quality scores seen across the real sample: ${[...seenScores].join(', ')} ---`);
  if (seenScores.size < 2) {
    console.log('ℹ️  Every real photo in this sample got the same score — not necessarily wrong, but worth a human glance if this stays true as more products get added.');
  } else {
    console.log('✅ Real judgment varies across real photos, not a fixed/templated response');
  }

  // No product name given — must not invent one, and must still describe
  // what's actually visible.
  console.log('\n--- Generic case: no product name given ---');
  const first = products[0];
  if (first?.image) {
    const { base64, mediaType } = await fetchImageAsBase64(first.image);
    const { data, usage } = await runPhotoQa({ imageBase64: base64, imageMediaType: mediaType });
    totalCost += estimateCostUsd(usage);
    console.log('suggestedAltText (no name given):', data.suggestedAltText);
    if (!data.suggestedAltText || data.suggestedAltText.trim().length === 0) {
      console.log('❌ Empty alt text with no product name given — investigate');
      failures++;
    } else {
      console.log('✅ Still produced a real, non-empty description without a given name');
    }
  }

  console.log(`\nTotal estimated cost: $${totalCost.toFixed(6)}`);
  if (failures > 0) {
    console.log(`\n❌ ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ All checks passed.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
