/**
 * The vetted font/weight list for theme typography customization.
 *
 * "Font pickers, vetted list only (no arbitrary font URLs)" (Theme Track
 * B1.2, docs/THEME_SYSTEM_PLAN.md) — extracted here (Theme Track B2) from
 * where it previously only lived inline in theme-customize-client.tsx, a
 * 'use client' component, so it can be imported server-side too: Track B2's
 * AI styling feature (@/lib/themes/ai-style) must constrain Claude to pick
 * a font from this SAME list, never an invented/arbitrary one, exactly the
 * discipline B1.2 already established for the manual picker UI. One source
 * of truth for both, not two lists that could drift.
 */

export interface FontOption {
  value: string;
  label: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
];

export const FONT_WEIGHTS: readonly FontOption[] = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' },
];

const VETTED_FONT_NAMES: ReadonlySet<string> = new Set(FONT_OPTIONS.map((f) => f.value));
const VETTED_WEIGHT_VALUES: ReadonlySet<number> = new Set(FONT_WEIGHTS.map((w) => Number(w.value)));

export function isVettedFontName(value: string): boolean {
  return VETTED_FONT_NAMES.has(value);
}

export function isVettedFontWeight(value: number): boolean {
  return VETTED_WEIGHT_VALUES.has(value);
}
