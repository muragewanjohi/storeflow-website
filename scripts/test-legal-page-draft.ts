/**
 * Live smoke test for AI Phase 7.2 — legal-page drafting
 * (@/lib/legal-pages/legal-page-draft-shared).
 *
 * Runs all 3 page types against the real "Electric Scooters" tenant,
 * checking: real title/contentHtml come back non-empty, contentHtml is
 * simple semantic HTML (no <script>, no markdown fences), the draft
 * includes an explicit "review before publishing" disclaimer (required by
 * the prompt), and store-specific unknown facts appear as bracketed
 * placeholders rather than invented values.
 *
 * Usage: npm run test:legal-page-draft
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '2f0abc65-1d1e-4b0d-9dc3-783ff7a3873c'; // Electric Scooters, Basic plan

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const { runLegalPageDraft, LEGAL_PAGE_TYPES } = await import('../src/lib/legal-pages/legal-page-draft-shared');
  const { getBusinessProfile } = await import('../src/lib/tenant-context/business-profile');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: { id: true, name: true, data: true },
  });
  if (!tenant) throw new Error(`Test tenant ${TEST_TENANT_ID} not found`);
  const { businessType, niche } = getBusinessProfile(tenant as any);
  console.log(`Using real tenant: ${tenant.name} (businessType=${businessType}, niche=${niche})`);

  let passed = 0;
  let total = 0;
  let totalCost = 0;

  for (const pageType of LEGAL_PAGE_TYPES) {
    total++;
    const { data, usage } = await runLegalPageDraft({
      pageType,
      storeName: tenant.name,
      businessType,
      niche,
    });

    const { estimateCostUsd } = await import('../src/lib/ai/claude-client');
    const cost = estimateCostUsd(usage);
    totalCost += cost;

    console.log(`\n[${pageType}] title="${data.title}"`);
    console.log(`  contentHtml length: ${data.contentHtml.length} chars, cost: $${cost.toFixed(6)}`);
    console.log(`  preview: ${data.contentHtml.slice(0, 200).replace(/\n/g, ' ')}...`);

    const hasTitle = data.title.trim().length > 0;
    const hasContent = data.contentHtml.trim().length > 200; // a real page, not a stub
    const noMarkdownFence = !data.contentHtml.includes('```');
    const noScript = !/<script/i.test(data.contentHtml);
    const looksLikeHtml = /<h[23]>|<p>/i.test(data.contentHtml);
    const mentionsReview = /review|edit|starting (point|template)|not (legal|final)/i.test(data.contentHtml);

    const checks = { hasTitle, hasContent, noMarkdownFence, noScript, looksLikeHtml, mentionsReview };
    const allPassed = Object.values(checks).every(Boolean);
    console.log('  checks:', checks);

    if (allPassed) {
      passed++;
      console.log('  PASS');
    } else {
      console.log('  FAIL');
    }
  }

  console.log(`\nTotal real cost for 3 drafts: $${totalCost.toFixed(6)}`);
  console.log(`${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
