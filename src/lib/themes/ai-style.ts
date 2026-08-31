/**
 * Theme Track B2 — AI-assisted styling, two entry points producing the SAME
 * output (`custom_colors`/`custom_fonts`, the exact shape
 * PUT /api/themes/current already accepts and persists):
 *
 *  - B2.1: a free-text mood prompt ("warm and earthy", "energetic and
 *    bold") -> generateThemeStyleFromPrompt(), a text-only Claude call.
 *  - B2.2: a reference screenshot ("make it feel like this site") ->
 *    generateThemeStyleFromScreenshot(), a Claude VISION call over a real
 *    captured image (@/lib/themes/screenshot-capture.ts owns the actual
 *    capture + SSRF hardening; this module never fetches a URL itself).
 *
 * "Two entry points, both producing the SAME output... Neither ever touches
 * layout, imagery, or copy." (docs/THEME_SYSTEM_PLAN.md) — both functions
 * share the exact same schema, defensive re-validation (validateRawThemeStyle
 * below), and "inspired by, never a clone of" guardrail, so the two entry
 * points can never drift into different quality/safety bars.
 *
 * Deliberately generate-then-preview, not generate-then-save: this module
 * only ever returns a proposed payload. Actually persisting it is the
 * existing PUT /api/themes/current (already real-sanitized/Pro-gated for
 * custom_css by Theme Track B1.4 — this module never touches custom_css at
 * all, colors/fonts only) — the merchant applies it via the same Save
 * button as a manual edit, after seeing it in the existing live preview.
 */

import { generateJson, generateJsonFromImage } from '@/lib/ai/claude-client';
import type { AiUsage } from '@/lib/ai/claude-client';
import { THEME_COLOR_SETTINGS, type ThemeColorKey } from '@/lib/themes/color-settings';
import { FONT_OPTIONS, FONT_WEIGHTS, isVettedFontName, isVettedFontWeight } from '@/lib/themes/font-settings';

export interface AiThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  buttonBackground: string;
  buttonText: string;
}

export interface AiThemeTypography {
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  bodyWeight: number;
}

export interface AiThemeStyleResult {
  colors: AiThemeColors;
  typography: AiThemeTypography;
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

const COLOR_KEYS: readonly ThemeColorKey[] = THEME_COLOR_SETTINGS.map((s) => s.key);

const colorSchemaProperties = Object.fromEntries(
  COLOR_KEYS.map((key) => [key, { type: 'string' }])
);

const themeStyleSchema = {
  type: 'object',
  properties: {
    colors: {
      type: 'object',
      properties: colorSchemaProperties,
      required: [...COLOR_KEYS],
      additionalProperties: false,
    },
    headingFont: { type: 'string' },
    bodyFont: { type: 'string' },
    headingWeight: { type: 'integer' },
    bodyWeight: { type: 'integer' },
  },
  required: ['colors', 'headingFont', 'bodyFont', 'headingWeight', 'bodyWeight'],
  additionalProperties: false,
} as const;

interface RawThemeStyleResult {
  colors: Record<string, string>;
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  bodyWeight: number;
}

/** Safe, on-brand fallback values used whenever Claude's output for a given field can't be trusted as-is — never let a malformed value reach a real tenant_themes row. */
function defaultColorFor(key: ThemeColorKey): string {
  return THEME_COLOR_SETTINGS.find((s) => s.key === key)?.recommended ?? '#000000';
}
const DEFAULT_HEADING_FONT = 'Montserrat';
const DEFAULT_BODY_FONT = 'Inter';
const DEFAULT_HEADING_WEIGHT = 700;
const DEFAULT_BODY_WEIGHT = 400;

function buildSystemPrompt(): string {
  const colorList = THEME_COLOR_SETTINGS.map((s) => `"${s.key}" (${s.description.replace(/^Used for:\s*/, '')})`).join('; ');
  const fontList = FONT_OPTIONS.map((f) => f.value).join(', ');
  const weightList = FONT_WEIGHTS.map((w) => w.value).join(', ');

  return [
    "You are a color-and-typography stylist for DukaNest, a multi-tenant ecommerce platform. A merchant describes a mood or feeling they want their storefront to have — your job is ONLY to translate that mood into a real color palette and font pairing.",
    `Return exactly these 8 hex colors, each formatted as "#RRGGBB": ${colorList}.`,
    'Colors must form a real, usable, accessible palette: "text" must have strong contrast against "background", "buttonText" must have strong contrast against "buttonBackground", and "background" should stay light/neutral enough for body text to be readable (a mood like "dark and moody" should still keep body copy legible, not literally black-on-black).',
    `Pick "headingFont" and "bodyFont" EXACTLY, character-for-character, from this list only — never invent a font name: ${fontList}. It is fine to pick the same font for both.`,
    `Pick "headingWeight" and "bodyWeight" as integers from this list only: ${weightList}. Headings are typically bolder (600-700) than body text (400-500), but let the requested mood guide the exact choice.`,
    'CRITICAL SCOPE LIMIT: you are extracting a color/typography MOOD only. Never suggest, mention, or imply anything about page layout, which theme/template to use, product imagery, or written copy/content — those are separate, unrelated decisions the merchant makes elsewhere. If their request asks for any of those (e.g. "add a new banner", "change my layout", "write me a tagline"), politely ignore that part and just style the palette/fonts as best you can from whatever mood is implied.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

/**
 * Real defensive re-validation shared by BOTH entry points — every field is
 * checked against its real, safe constraint (valid hex, vetted font, vetted
 * weight) and silently corrected to a safe default if Claude's output
 * doesn't comply, same "don't trust the model's output format, verify in
 * code" discipline as every other structured-output call in this codebase
 * (e.g. expense-categorize's allow-list re-check).
 */
function validateRawThemeStyle(raw: RawThemeStyleResult): AiThemeStyleResult {
  const colors = Object.fromEntries(
    COLOR_KEYS.map((key) => {
      const value = raw.colors?.[key];
      const valid = typeof value === 'string' && HEX_COLOR_RE.test(value.trim());
      return [key, valid ? value!.trim() : defaultColorFor(key)];
    })
  ) as unknown as AiThemeColors;

  const headingFont = isVettedFontName(raw.headingFont) ? raw.headingFont : DEFAULT_HEADING_FONT;
  const bodyFont = isVettedFontName(raw.bodyFont) ? raw.bodyFont : DEFAULT_BODY_FONT;
  const headingWeight = isVettedFontWeight(raw.headingWeight) ? raw.headingWeight : DEFAULT_HEADING_WEIGHT;
  const bodyWeight = isVettedFontWeight(raw.bodyWeight) ? raw.bodyWeight : DEFAULT_BODY_WEIGHT;

  return {
    colors,
    typography: { headingFont, bodyFont, headingWeight, bodyWeight },
  };
}

export interface GenerateThemeStyleFromPromptParams {
  prompt: string;
}

export interface GenerateThemeStyleFromPromptResult {
  data: AiThemeStyleResult;
  usage: AiUsage;
}

/** B2.1 — free-text mood prompt. See validateRawThemeStyle() for the shared safety net. */
export async function generateThemeStyleFromPrompt(
  params: GenerateThemeStyleFromPromptParams
): Promise<GenerateThemeStyleFromPromptResult> {
  const { data: raw, usage } = await generateJson<RawThemeStyleResult>({
    system: buildSystemPrompt(),
    userContent: `Mood/style request: "${params.prompt.trim()}"`,
    schema: themeStyleSchema,
    maxTokens: 400,
  });

  return { data: validateRawThemeStyle(raw), usage };
}

function buildVisionSystemPrompt(): string {
  const colorList = THEME_COLOR_SETTINGS.map((s) => `"${s.key}" (${s.description.replace(/^Used for:\s*/, '')})`).join('; ');
  const fontList = FONT_OPTIONS.map((f) => f.value).join(', ');
  const weightList = FONT_WEIGHTS.map((w) => w.value).join(', ');

  return [
    "You are a color-and-typography stylist for DukaNest, a multi-tenant ecommerce platform. A merchant has shared a screenshot of another website whose overall FEELING they like — your job is ONLY to translate the general color palette and typography mood of that reference into a real color palette and font pairing for their own store.",
    'CRITICAL: this is inspiration for a MOOD, never a clone. Do not attempt to reproduce the reference site\'s exact layout, exact imagery, logo, brand marks, or written copy — none of that is relevant here, and none of it would even be usable (you are only picking colors and fonts). Ignore any text, logos, or people visible in the screenshot entirely; look only at the general color palette and the typographic character (e.g. bold vs. delicate, modern vs. classic, rounded vs. sharp) of what you see.',
    `Return exactly these 8 hex colors, each formatted as "#RRGGBB": ${colorList}.`,
    'Colors must form a real, usable, accessible palette: "text" must have strong contrast against "background", "buttonText" must have strong contrast against "buttonBackground", and "background" should stay light/neutral enough for body text to be readable.',
    `Pick "headingFont" and "bodyFont" EXACTLY, character-for-character, from this list only — never invent a font name, and never claim to match the reference site's actual font (you cannot know it from a screenshot, only its general character): ${fontList}. It is fine to pick the same font for both.`,
    `Pick "headingWeight" and "bodyWeight" as integers from this list only: ${weightList}.`,
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

export interface GenerateThemeStyleFromScreenshotParams {
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export interface GenerateThemeStyleFromScreenshotResult {
  data: AiThemeStyleResult;
  usage: AiUsage;
}

/**
 * B2.2 — reference-screenshot styling. Takes an already-captured image
 * (see @/lib/themes/screenshot-capture.ts for the real capture + SSRF
 * hardening — this function never fetches a URL itself, only interprets an
 * image it's handed). Same shared schema/safety net as B2.1 via
 * validateRawThemeStyle().
 */
export async function generateThemeStyleFromScreenshot(
  params: GenerateThemeStyleFromScreenshotParams
): Promise<GenerateThemeStyleFromScreenshotResult> {
  const { data: raw, usage } = await generateJsonFromImage<RawThemeStyleResult>({
    system: buildVisionSystemPrompt(),
    instructionText: 'Extract a color palette and font pairing inspired by the general mood of this reference screenshot.',
    imageBase64: params.imageBase64,
    imageMediaType: params.mediaType,
    schema: themeStyleSchema,
    maxTokens: 400,
  });

  return { data: validateRawThemeStyle(raw), usage };
}
