/**
 * Theme Track B1.4 — real sanitization for merchant-submitted Custom CSS.
 *
 * "Gate raw custom_css/custom_js behind Pro/Premium + sanitize on save.
 * Real XSS surface — do not ship unsanitized." (docs/THEME_SYSTEM_PLAN.md)
 *
 * Custom JS was deliberately dropped from this feature entirely — direct
 * user request, confirmed via AskUserQuestion: arbitrary JS execution on
 * every customer's browser (on a platform that handles real M-Pesa/Pesapal
 * payment flows) isn't a risk this platform takes on, "sanitizing" JS input
 * doesn't meaningfully reduce that risk the way it does for CSS/HTML, since
 * the execution itself IS the attack surface. Custom CSS is a genuinely
 * different, tractable problem — real CSS-only styling has no
 * general-purpose code-execution vector once dangerous legacy constructs
 * (expression(), -moz-binding, behavior, javascript: URLs) are stripped.
 *
 * Uses postcss (already a project dependency, moved from devDependencies
 * to dependencies since this needs it at runtime in API routes, not just
 * at build time for Tailwind) to parse into a real AST and walk it —
 * deliberately NOT a regex-based sanitizer, which is well-known to be
 * unreliable against CSS's actual grammar (comments, nested functions,
 * escaped characters can all defeat naive string matching).
 */

import postcss from 'postcss';

export const MAX_CUSTOM_CSS_LENGTH = 50_000;

// At-rules that are legitimate, real styling tools with no code-execution
// vector. Everything else (most importantly @import, which can load
// arbitrary remote CSS/exfiltrate data via query strings) is stripped.
const ALLOWED_AT_RULES = new Set(['media', 'supports', 'keyframes', 'font-face', 'page']);

// Properties with a real, historical XSS/code-execution track record in
// some browser or another — never allowed regardless of value.
const BLOCKED_PROPERTIES = new Set(['-moz-binding', 'behavior']);

const DANGEROUS_VALUE_PATTERN = /expression\s*\(|javascript:|vbscript:|-moz-binding/i;

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^data:image\//i.test(trimmed)) return true;
  return false;
}

export interface CustomCssSanitizeResult {
  css: string;
  removedCount: number;
}

export class CustomCssValidationError extends Error {}

/**
 * Parses, sanitizes, and re-serializes merchant-submitted CSS. Throws
 * CustomCssValidationError for input that can't be safely handled at all
 * (too long, or doesn't parse as valid CSS — never attempt to "fix" broken
 * syntax, reject it outright and ask the merchant to correct it).
 */
export function sanitizeCustomCss(rawCss: string): CustomCssSanitizeResult {
  if (rawCss.length > MAX_CUSTOM_CSS_LENGTH) {
    throw new CustomCssValidationError(`Custom CSS must be under ${MAX_CUSTOM_CSS_LENGTH.toLocaleString()} characters.`);
  }

  let root;
  try {
    root = postcss.parse(rawCss);
  } catch (error) {
    throw new CustomCssValidationError(
      `Invalid CSS: ${error instanceof Error ? error.message : 'could not be parsed'}`
    );
  }

  let removedCount = 0;

  root.walkComments((comment) => {
    comment.remove();
    removedCount++;
  });

  root.walkAtRules((atRule) => {
    if (!ALLOWED_AT_RULES.has(atRule.name.toLowerCase())) {
      atRule.remove();
      removedCount++;
    }
  });

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    if (BLOCKED_PROPERTIES.has(prop)) {
      decl.remove();
      removedCount++;
      return;
    }
    if (DANGEROUS_VALUE_PATTERN.test(decl.value)) {
      decl.remove();
      removedCount++;
      return;
    }
    // Validate every url(...) reference in the value individually — a
    // value can legitimately contain multiple (e.g. a multi-layer
    // background-image).
    const urlMatches = [...decl.value.matchAll(/url\(\s*([^)]+?)\s*\)/gi)];
    for (const match of urlMatches) {
      if (!isSafeUrl(match[1])) {
        decl.remove();
        removedCount++;
        break;
      }
    }
  });

  // Belt-and-suspenders: valid CSS syntax can never legitimately produce
  // the literal sequence "</style" (it isn't parseable as a selector,
  // property, or value), so postcss's own serializer should never emit
  // it from content that survived parsing above -- but this is rendered
  // inside a real <style> tag via dangerouslySetInnerHTML (see
  // storefront-custom-css.tsx), so it gets one more explicit guard
  // regardless of that reasoning, since the cost of being wrong about a
  // parser edge case here is a real style-tag-breakout XSS.
  const serialized = root.toString().replace(/<\/style/gi, '');

  return { css: serialized, removedCount };
}
