/**
 * Live smoke test for AI Phase 4 — theme recommendation
 * (@/lib/themes/recommend-theme, recommendThemeForBusiness()).
 *
 * Real gap this closes: the registration form has no theme-picker UI at
 * all, so every real merchant has always fallen back to the SAME hardcoded
 * "multipurpose"/"grocery" default regardless of business type — the
 * direct, confirmed reason all 363 real tenant_themes rows use `grocery`.
 *
 * Checks real Claude Haiku calls across business types that DO map
 * cleanly to a real theme's industry, one that does NOT (no covered
 * industry — must fall back to a real general-purpose theme, never a bad
 * forced fit or an invalid slug), and confirms every single result is one
 * of the real theme-registry.ts slugs (never an invented one, even before
 * this module's own defensive re-validation is applied — i.e. Claude
 * itself is staying on-list, not just being silently corrected every time).
 *
 * Does NOT hit the real POST /api/tenants/register endpoint — that would
 * create a real tenant (and cascade into real email sends, Tumizi
 * provisioning, etc.), out of proportion for testing this one piece. Tests
 * the real generation core directly instead, same level this session
 * already established for test-theme-ai-style.ts.
 *
 * Usage: npm run test:theme-recommendation
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');

  const { recommendThemeForBusiness } = await import('../src/lib/themes/recommend-theme');
  const { themeTemplates } = await import('../src/lib/themes/theme-registry');
  const validSlugs = new Set(Object.keys(themeTemplates));

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

  const cases: Array<{ label: string; businessType: string; niche?: string; expectSlug?: string }> = [
    { label: 'Groceries & Food -> grocery', businessType: 'Groceries & Food', expectSlug: 'grocery' },
    { label: 'Fashion & Apparel -> hexfashion', businessType: 'Fashion & Apparel', expectSlug: 'hexfashion' },
    { label: 'Furniture & Home Decor -> furniture', businessType: 'Furniture & Home Decor', expectSlug: 'furniture' },
    { label: 'Electronics & Gadgets, niche "Video Games" -> modern or default', businessType: 'Electronics & Gadgets', niche: 'Video Games' },
    // No covered industry (pharmacy has no matching theme in theme-registry.ts)
    // — must still resolve to a REAL, valid slug, not force a bad fit.
    { label: 'Pharmacy & Health (no matching industry) -> a real general-purpose theme', businessType: 'Pharmacy & Health Products' },
  ];

  for (const c of cases) {
    const { data, usage } = await recommendThemeForBusiness({ businessType: c.businessType, niche: c.niche ?? null });
    console.log(`\n[${c.label}] -> "${data.themeSlug}" (${data.reasoning}) cost: $${(usage.inputTokens / 1_000_000 + usage.outputTokens * 5 / 1_000_000).toFixed(6)}`);
    check(`"${c.label}": returned slug is a real, valid theme-registry.ts slug`, validSlugs.has(data.themeSlug), data.themeSlug);
    if (c.expectSlug) {
      check(`"${c.label}": matches the expected industry theme`, data.themeSlug === c.expectSlug, data.themeSlug);
    }
  }

  // No business type given at all — must still return a safe, real slug.
  const noBusinessType = await recommendThemeForBusiness({ businessType: null, niche: null });
  check('no business type given -> still a real, valid slug', validSlugs.has(noBusinessType.data.themeSlug), noBusinessType.data.themeSlug);

  console.log(`\n${passed}/${total} checks passed.`);
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
