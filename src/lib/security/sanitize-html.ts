const BLOCKED_TAGS = /<\/?(script|style|iframe|object|embed|link|meta)[^>]*>/gi;
const EVENT_HANDLER_ATTRS = /\son[a-z]+\s*=\s*(['"]).*?\1/gi;
const JAVASCRIPT_URLS = /\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi;

/**
 * Lightweight HTML sanitizer for user/AI-provided rich text.
 * Removes executable tags, inline event handlers, and javascript: URLs.
 */
export function sanitizeHtmlForDisplay(value: string): string {
  return value
    .replace(BLOCKED_TAGS, '')
    .replace(EVENT_HANDLER_ATTRS, '')
    .replace(JAVASCRIPT_URLS, '');
}
