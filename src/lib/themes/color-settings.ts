import type { ThemeColors } from '@/types/theme';

export type ThemeColorKey =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'text'
  | 'muted'
  | 'buttonBackground'
  | 'buttonText';

export interface ThemeColorSettingDefinition {
  key: ThemeColorKey;
  label: string;
  description: string;
  recommended: string;
  note?: string;
}

export interface ThemeColorSettingWithDefault extends ThemeColorSettingDefinition {
  defaultHex: string;
}

export const THEME_COLOR_SETTINGS: readonly ThemeColorSettingDefinition[] = [
  {
    key: 'primary',
    label: 'Primary Color',
    description: 'Used for: Primary buttons, links, active navigation items, CTAs, badges, and accent elements',
    recommended: '#4CAF50',
    note: 'Recommended: Blue (#2196F3) or Green (#4CAF50) for trust and action',
  },
  {
    key: 'secondary',
    label: 'Secondary Color',
    description: 'Used for: Secondary buttons, hover states, complementary UI elements',
    recommended: '#10b981',
    note: 'Should complement primary color',
  },
  {
    key: 'accent',
    label: 'Accent Color',
    description: 'Used for: Highlights, special features, decorative elements, hover effects, and active links',
    recommended: '#FF9800',
    note: 'Use sparingly for emphasis',
  },
  {
    key: 'background',
    label: 'Background Color',
    description: 'Used for: Page background color (applied via CSS variables)',
    recommended: '#FFFFFF',
    note: 'Keep light (#FFFFFF or #FAFAFA) for readability',
  },
  {
    key: 'text',
    label: 'Text Color',
    description: 'Used for: Main text color, headings, body text (applied via CSS variables)',
    recommended: '#212121',
    note: 'Dark neutral (#212121 or #1A1A1A) for contrast',
  },
  {
    key: 'muted',
    label: 'Muted Color',
    description: 'Used for: Muted text, placeholders, secondary text, borders',
    recommended: '#6B7280',
    note: 'Use medium grey (#6B7280 or #9CA3AF) and avoid low-contrast combinations',
  },
  {
    key: 'buttonBackground',
    label: 'Button Background Color',
    description: 'Used for: Button background color (applied via CSS variables --button-background)',
    recommended: '#4CAF50',
    note: 'Typically matches primary color',
  },
  {
    key: 'buttonText',
    label: 'Button Text Color',
    description: 'Used for: Button text color (applied via CSS variables --button-text)',
    recommended: '#FFFFFF',
    note: 'Choose a high-contrast value against button background',
  },
];

export function getThemeColorSettingsWithDefaults(
  baseColors: Partial<ThemeColors> | null | undefined
): ThemeColorSettingWithDefault[] {
  return THEME_COLOR_SETTINGS.map((setting) => {
    const fallback = setting.recommended;
    const fromTheme = baseColors?.[setting.key];
    return {
      ...setting,
      defaultHex: typeof fromTheme === 'string' && fromTheme.trim().length > 0 ? fromTheme : fallback,
    };
  });
}
