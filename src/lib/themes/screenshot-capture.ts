/**
 * Theme Track B2.2 — reference-screenshot capture for AI-assisted styling
 * ("make it feel like this site"). Captures an above-the-fold screenshot of
 * a merchant-supplied URL for Claude vision to extract a color/typography
 * mood from — never used to clone layout/copy, see @/lib/themes/ai-style.ts.
 *
 * Real infra decision (previously flagged as unresolved in
 * docs/IMPLEMENTATION_TRACKER.md): this platform deploys to Vercel
 * serverless, which has no Chromium binary by default. Uses `playwright-core`
 * (the driver only, no bundled browser — already a natural fit since
 * @playwright/test is already a project devDependency for E2E) paired with
 * `@sparticuz/chromium` (a Chromium binary built for Lambda/Vercel's
 * environment) in production. Locally, @sparticuz/chromium's binary is a
 * Linux-only ELF executable and cannot run on a Windows/Mac dev machine —
 * playwright-core falls back to discovering the browser @playwright/test's
 * own `npm run playwright:install` already downloaded into the shared
 * Playwright cache, so no separate local setup is needed.
 *
 * SSRF hardening (a merchant-supplied URL that our server's own headless
 * browser will navigate to is a classic SSRF vector — this must never be
 * allowed to reach an internal service, cloud metadata endpoint, or
 * loopback address): every navigation (the initial URL AND every redirect
 * it makes, not just the first) is intercepted via page.route() and its
 * resolved IP checked against real private/reserved ranges before being
 * allowed through — checking only the initial URL would leave a real
 * redirect-to-internal-IP bypass open.
 */

import { chromium, type Browser } from 'playwright-core';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const NAVIGATION_TIMEOUT_MS = 15_000;
const VIEWPORT = { width: 1280, height: 800 };

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
    if (a === 0) return true; // "this network"
    if (a >= 224) return true; // multicast/reserved (224-255)
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local (fc00::/7)
    if (lower.startsWith('::ffff:')) {
      // IPv4-mapped IPv6 — re-check the embedded IPv4 address
      const embedded = lower.replace('::ffff:', '');
      if (isIP(embedded) === 4) return isPrivateOrReservedIp(embedded);
    }
    return false;
  }
  return true; // not a parseable IP at all — reject rather than guess
}

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
}

/** Real DNS resolution + private-range check — never trust the hostname string alone. */
export async function checkUrlSafeToCapture(rawUrl: string): Promise<UrlSafetyResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'That doesn\'t look like a valid URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'Only http:// and https:// URLs are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { safe: false, reason: 'That URL points at a local/internal address, which can\'t be captured.' };
  }

  try {
    const { address } = await lookup(hostname);
    if (isPrivateOrReservedIp(address)) {
      return { safe: false, reason: 'That URL resolves to a private or internal address, which can\'t be captured.' };
    }
  } catch {
    return { safe: false, reason: 'Could not resolve that URL — please check it and try again.' };
  }

  return { safe: true };
}

async function getBrowser(): Promise<Browser> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const sparticuzChromium = (await import('@sparticuz/chromium')).default;
    const executablePath = await sparticuzChromium.executablePath();
    return chromium.launch({
      args: sparticuzChromium.args,
      executablePath,
      headless: true,
    });
  }
  // Local dev — playwright-core discovers @playwright/test's own cached
  // browser (from `npm run playwright:install`); @sparticuz/chromium's
  // Linux binary can't run here anyway.
  return chromium.launch({ headless: true });
}

export type CaptureUrlScreenshotResult =
  | { success: true; imageBase64: string; mediaType: 'image/png' }
  | { success: false; error: string };

/**
 * Captures a real, above-the-fold (1280x800) screenshot of `url` — the SAME
 * SSRF check that gated the initial URL is re-applied to every subsequent
 * navigation (redirects included) via page.route(), so a URL that looks
 * safe but redirects to an internal address is still blocked before the
 * browser ever loads it.
 */
export async function captureUrlScreenshot(url: string): Promise<CaptureUrlScreenshotResult> {
  const initialCheck = await checkUrlSafeToCapture(url);
  if (!initialCheck.safe) {
    return { success: false, error: initialCheck.reason || 'That URL cannot be captured.' };
  }

  let browser: Browser | null = null;
  try {
    browser = await getBrowser();
  } catch (error) {
    console.error('[ThemeStyleFromUrl] Failed to launch headless browser', error);
    return { success: false, error: 'Screenshot capture is not available right now — please try again later.' };
  }

  try {
    const page = await browser.newPage({ viewport: VIEWPORT });

    // Re-validate every real navigation this page makes (initial load AND
    // every redirect) before letting it through — closes the
    // redirect-to-internal-IP gap a one-time check on the original URL
    // would leave open.
    await page.route('**/*', async (route) => {
      const request = route.request();
      if (request.resourceType() !== 'document') {
        return route.continue();
      }
      const check = await checkUrlSafeToCapture(request.url());
      if (!check.safe) {
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });

    let response;
    try {
      response = await page.goto(url, { waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Navigation failed';
      if (message.toLowerCase().includes('blockedbyclient')) {
        return { success: false, error: 'That URL redirected to a private or internal address, which can\'t be captured.' };
      }
      return { success: false, error: 'Could not load that page — please check the URL and try again.' };
    }
    if (!response || !response.ok()) {
      return { success: false, error: `Could not load that page (HTTP ${response?.status() ?? 'unknown'}).` };
    }

    const buffer = await page.screenshot({ type: 'png' });
    return { success: true, imageBase64: buffer.toString('base64'), mediaType: 'image/png' };
  } catch (error) {
    console.error('[ThemeStyleFromUrl] Screenshot capture failed', error);
    return { success: false, error: 'Something went wrong capturing that page — please try again.' };
  } finally {
    await browser.close().catch(() => {});
  }
}
