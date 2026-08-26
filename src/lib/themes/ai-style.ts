/**
 * Theme Track B2.1 — AI-assisted styling from a free-text mood prompt
 * ("warm and earthy", "energetic and bold") -> a real `custom_colors` /
 * `custom_fonts` payload in the exact shape PUT /api/themes/current already
 * accepts and persists.
 *
 * "Two entry points, both producing the SAME output... Neither ever touches
 * layout, imagery, or copy." (docs/THEME_SYSTEM_PLAN.md) — this module is
 * the shared core for the text-prompt entry point (B2.1); the
 * reference-screenshot entry point (B2.2) is a separate, not-yet-built
 * piece that would feed the same schema/validation here, just from a vision
 * call instead of a text one.
 *
 * Deliberately generate-then-preview, not generate-then-save: this module
 * only ever returns a proposed payload. Actually persisting it is the
 * existing PUT /api/themes/current (already real-sanitized/Pro-gated for
 * custom_css by Theme Track B1.4 — this module never touches custom_css at
 * all, colors/fonts only) — the merchant applies it via the same Save
 * button as a manual edit, after seeing it in the existing live preview.
 */

import { generateJson } from '@/lib/ai/claude-client';
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

export interface GenerateThemeStyleFromPromptParams {
  prompt: string;
}

export interface GenerateThemeStyleFromPromptResult {
  data: AiThemeStyleResult;
  usage: AiUsage;
}

/**
 * Real generation + defensive re-validation — every field is checked
 * against its real, safe constraint (valid hex, vetted font, vetted
 * weight) and silently corrected to a safe default if Claude's output
 * doesn't comply, same "don't trust the model's output format, verify in
 * code" discipline as every other structured-output call in this codebase
 * (e.g. expense-categorize's allow-list re-check).
 */
export async function generateThemeStyleFromPrompt(
  params: GenerateThemeStyleFromPromptParams
): Promise<GenerateThemeStyleFromPromptResult> {
  const { data: raw, usage } = await generateJson<RawThemeStyleResult>({
    system: buildSystemPrompt(),
    userContent: `Mood/style request: "${params.prompt.trim()}"`,
    schema: themeStyleSchema,
    maxTokens: 400,
  });

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
    data: {
      colors,
      typography: { headingFont, bodyFont, headingWeight, bodyWeight },
    },
    usage,
  };
}
