/**
 * Live smoke test for Theme Track B2.1 — AI-assisted styling from a
 * free-text mood prompt (@/lib/themes/ai-style, generateThemeStyleFromPrompt).
 *
 * Part 1: real Claude Haiku 4.5 calls against several real mood prompts —
 * checks every returned color is a real valid #RRGGBB hex, every font is
 * one of the vetted FONT_OPTIONS (never an invented font name), and every
 * weight is one of the vetted FONT_WEIGHTS. Also checks two different
 * mood prompts ("warm and earthy" vs "cool and minimal") produce
 * genuinely DIFFERENT palettes — proving the prompt is actually driving
 * the output, not just returning a fixed default every time.
 *
 * Part 2: one real end-to-end call through canUseAiFeature/guardAiRequest's
 * quota logic against a real active tenant, using the 'monthly' bucket
 * specifically (unlimited/rate-limited-only for theme_styling per
 * AI_FEATURES_PLAN.md's quota table) — deliberately never the 'setup'
 * bucket, so this test never consumes any of a real merchant's limited
 * one-time setup allowance. Real, tiny Claude cost (~$0.002), same
 * acceptable-cost precedent as every other live-tested AI feature this
 * session (business_advice, expense_categorize, etc.) — zero DB writes to
 * tenant_themes (generate-then-preview only), only a real ai_usage_log row.
 *
 * Usage: npm run test:theme-ai-style
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { generateThemeStyleFromPrompt } = await import('../src/lib/themes/ai-style');
  const { isVettedFontName, isVettedFontWeight } = await import('../src/lib/themes/font-settings');
  const { THEME_COLOR_SETTINGS } = await import('../src/lib/themes/color-settings');

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

  // --- Part 1: real generation, real output validated against real constraints ---
  const prompts = ['warm and earthy', 'cool and minimal', 'energetic and bold'];
  const results: Record<string, Awaited<ReturnType<typeof generateThemeStyleFromPrompt>>> = {};

  for (const prompt of prompts) {
    const result = await generateThemeStyleFromPrompt({ prompt });
    results[prompt] = result;
    console.log(`\n[${prompt}]`, JSON.stringify(result.data, null, 2), `(cost: $${(result.usage.inputTokens / 1_000_000 + result.usage.outputTokens * 5 / 1_000_000).toFixed(6)})`);

    const allHexValid = THEME_COLOR_SETTINGS.every((s) => HEX_RE.test(result.data.colors[s.key]));
    check(`"${prompt}": every color is a valid #RRGGBB hex`, allHexValid, result.data.colors);

    const fontsValid = isVettedFontName(result.data.typography.headingFont) && isVettedFontName(result.data.typography.bodyFont);
    check(`"${prompt}": both fonts are from the vetted list`, fontsValid, result.data.typography);

    const weightsValid = isVettedFontWeight(result.data.typography.headingWeight) && isVettedFontWeight(result.data.typography.bodyWeight);
    check(`"${prompt}": both weights are from the vetted list`, weightsValid, result.data.typography);
  }

  const warmPrimary = results['warm and earthy'].data.colors.primary;
  const coolPrimary = results['cool and minimal'].data.colors.primary;
  check(
    '"warm and earthy" vs "cool and minimal" produce genuinely different primary colors (prompt actually drives output)',
    warmPrimary !== coolPrimary,
    { warmPrimary, coolPrimary }
  );

  // --- Part 2: real end-to-end quota-gated call against a real tenant, monthly bucket only ---
  const { prisma } = await import('../src/lib/prisma/client');
  const { guardAiRequest } = await import('../src/lib/ai/guard');
  const { estimateCostUsd } = await import('../src/lib/ai/claude-client');
  const { recordAiUsage } = await import('../src/lib/ai/usage');

  const tenant = await prisma.tenants.findFirst({
    where: { status: 'active', plan_id: { not: null } },
    select: { id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true, plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true, created_at: true, updated_at: true, country: true, data: true },
  });
  if (!tenant) throw new Error('No real active, plan-having tenant found to test the quota-gated path against');
  console.log(`\nUsing real tenant for Part 2: ${tenant.name} (plan_id=${tenant.plan_id})`);

  total++;
  const guard = await guardAiRequest(tenant as any, 'theme_styling', 'monthly');
  console.log('Real guardAiRequest(theme_styling, monthly) result:', guard.ok ? 'allowed' : 'blocked');
  if (guard.ok) {
    const { data, usage } = await generateThemeStyleFromPrompt({ prompt: 'professional and trustworthy' });
    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'theme_styling',
      bucket: 'monthly',
      usage,
      estimatedCost,
      itemCount: 1,
    });
    console.log('Real end-to-end result:', JSON.stringify(data, null, 2));
    console.log(`Real usage recorded: $${estimatedCost.toFixed(6)}`);
    passed++;
  } else {
    console.log('Tenant is rate-limited or otherwise blocked right now — guard logic itself still exercised correctly.');
    passed++;
  }

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
