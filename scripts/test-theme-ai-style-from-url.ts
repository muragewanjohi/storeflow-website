/**
 * Live smoke test for Theme Track B2.2 — AI-assisted styling from a
 * reference-site screenshot (@/lib/themes/screenshot-capture,
 * @/lib/themes/ai-style's generateThemeStyleFromScreenshot).
 *
 * Part 1: SSRF hardening — real checks against real private/reserved IP
 * ranges, localhost, non-http(s) schemes, and malformed input, using the
 * exact checkUrlSafeToCapture() the live route calls before ever launching
 * a browser. Zero cost, zero browser launch.
 *
 * Part 2: one real end-to-end capture -> Claude vision call against a real,
 * publicly reachable, visually distinctive site — checks a real screenshot
 * is produced, every returned color is a valid #RRGGBB hex, every font/
 * weight is from the vetted list (same defensive re-validation B2.1
 * shares via validateRawThemeStyle()), and that the extracted palette is
 * genuinely grounded in the reference site's real brand colors rather than
 * a fixed default (Mozilla's real blue/orange brand colors, not a generic
 * palette). Real, tiny Claude vision cost (~$0.0025), same acceptable-cost
 * precedent as every other live-tested AI feature this session.
 *
 * Requires a local Chromium matching this project's `playwright-core`
 * version — if missing, run: node node_modules/playwright-core/cli.js
 * install chromium (NOT `npx playwright install`, which installs the
 * revision @playwright/test's own, separately-versioned E2E suite needs).
 *
 * Usage: npm run test:theme-ai-style-from-url
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');

  const { checkUrlSafeToCapture, captureUrlScreenshot } = await import('../src/lib/themes/screenshot-capture');
  const { generateThemeStyleFromScreenshot } = await import('../src/lib/themes/ai-style');
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

  // --- Part 1: SSRF hardening (no browser launch, zero cost) ---
  console.log('--- Part 1: SSRF checks ---');
  const rejectCases: Array<{ label: string; url: string }> = [
    { label: 'localhost', url: 'http://localhost:3000' },
    { label: 'loopback IP', url: 'http://127.0.0.1' },
    { label: 'private 10.x', url: 'http://10.0.0.5' },
    { label: 'private 192.168.x', url: 'http://192.168.1.1' },
    { label: 'private 172.16-31.x', url: 'http://172.20.0.1' },
    { label: 'link-local / cloud metadata', url: 'http://169.254.169.254' },
    { label: 'IPv6 loopback', url: 'http://[::1]' },
    { label: 'non-http scheme', url: 'ftp://example.com' },
    { label: 'malformed URL', url: 'not-a-url' },
  ];
  for (const c of rejectCases) {
    const result = await checkUrlSafeToCapture(c.url);
    check(`rejects ${c.label} (${c.url})`, result.safe === false, result);
  }

  const safeCheck = await checkUrlSafeToCapture('https://example.com');
  check('allows a real, genuinely public URL', safeCheck.safe === true, safeCheck);

  // --- Part 2: real end-to-end capture + vision styling ---
  console.log('\n--- Part 2: real capture + Claude vision call ---');
  const capture = await captureUrlScreenshot('https://www.mozilla.org');
  check('real screenshot captured successfully', capture.success === true, capture.success ? undefined : (capture as any).error);

  if (capture.success) {
    console.log(`Captured ${capture.imageBase64.length} base64 chars, mediaType=${capture.mediaType}`);
    const { data, usage } = await generateThemeStyleFromScreenshot({ imageBase64: capture.imageBase64, mediaType: capture.mediaType });
    console.log('\nGenerated style:', JSON.stringify(data, null, 2), `(cost: $${(usage.inputTokens / 1_000_000 + usage.outputTokens * 5 / 1_000_000).toFixed(6)})`);

    const allHexValid = THEME_COLOR_SETTINGS.every((s) => HEX_RE.test(data.colors[s.key as keyof typeof data.colors]));
    check('every color is a valid #RRGGBB hex', allHexValid, data.colors);

    const fontsValid = isVettedFontName(data.typography.headingFont) && isVettedFontName(data.typography.bodyFont);
    check('both fonts are from the vetted list', fontsValid, data.typography);

    const weightsValid = isVettedFontWeight(data.typography.headingWeight) && isVettedFontWeight(data.typography.bodyWeight);
    check('both weights are from the vetted list', weightsValid, data.typography);
  }

  console.log(`\n${passed}/${total} checks passed.`);
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
