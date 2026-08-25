/**
 * Theme Track B — live-preview postMessage protocol between
 * theme-customize-client.tsx (parent, the Colors/Typography tabs) and the
 * public preview iframe it embeds (src/app/theme-preview/[slug]/). Shared
 * constants so both sides use the exact same literal — a typo on either
 * end would otherwise fail silently (postMessage just never matches).
 *
 * Same-origin only: the iframe always embeds this app's own
 * /theme-preview/[slug] route, and both sides check event.origin before
 * acting on a message — this is a same-origin admin convenience channel,
 * not a cross-origin API.
 */

export const THEME_LIVE_PREVIEW_READY = 'dukanest-theme-preview-ready';
export const THEME_LIVE_PREVIEW_UPDATE = 'dukanest-theme-preview-update';

export interface ThemeLivePreviewUpdateMessage {
  type: typeof THEME_LIVE_PREVIEW_UPDATE;
  colors?: Record<string, string>;
  typography?: Record<string, string | number>;
}

export interface ThemeLivePreviewReadyMessage {
  type: typeof THEME_LIVE_PREVIEW_READY;
}
