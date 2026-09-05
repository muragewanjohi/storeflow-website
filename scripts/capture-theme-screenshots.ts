/**
 * Theme Track A3 — real theme screenshots, replacing Unsplash placeholders.
 *
 * Launches headless Chromium (via the project's existing @playwright/test
 * dependency, already used for E2E tests) against the new public, no-login
 * preview route (src/app/theme-preview/[slug]/page.tsx, built specifically
 * for this) and saves a real landscape screenshot per theme to
 * public/images/themes/{slug}-preview.png — matching the same local-file
 * convention DA.29 already used for the real furniture/grocery screenshots.
 *
 * Requires the dev server running locally first (npm run dev).
 *
 * Usage: npx tsx scripts/capture-theme-screenshots.ts [--slugs=hexfashion,grocery,...]
 */

import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3000';
const OUT_DIR = resolve(process.cwd(), 'public/images/themes');

const ALL_SLUGS = ['default', 'hexfashion', 'grocery', 'minimal', 'modern', 'furniture'];

async function main() {
  const slugArg = process.argv.find((a) => a.startsWith('--slugs='));
  const slugs = slugArg ? slugArg.replace('--slugs=', '').split(',') : ALL_SLUGS;

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const results: Array<{ slug: string; ok: boolean; path?: string; error?: string }> = [];

  try {
    for (const slug of slugs) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      try {
        const url = `${BASE_URL}/theme-preview/${slug}`;
        console.log(`Capturing ${slug} <- ${url}`);
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        if (!response || !response.ok()) {
          throw new Error(`Navigation failed: ${response?.status()}`);
        }
        // Give client-side theme-color CSS vars + demo content one more
        // beat to settle after networkidle (React Query resolves slightly
        // after the network request completes).
        await page.waitForTimeout(1000);

        const outPath = resolve(OUT_DIR, `${slug}-preview.png`);
        await page.screenshot({ path: outPath, type: 'png' });
        results.push({ slug, ok: true, path: outPath });
        console.log(`  Saved ${outPath}`);
      } catch (error) {
        results.push({ slug, ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
        console.error(`  FAILED: ${slug}`, error);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\nSummary:', results);
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length}/${results.length} captures failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} captures succeeded.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
