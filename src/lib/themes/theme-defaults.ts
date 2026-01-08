/**
 * Theme Defaults
 * 
 * Defines default colors and fonts for each theme when installed.
 * These defaults are applied automatically when a theme is first installed.
 */

import type { ThemeColors, ThemeTypography } from '@/types/theme';

export interface ThemeDefaults {
  colors: Partial<ThemeColors>;
  fonts: Partial<ThemeTypography>;
}

/**
 * Get default colors and fonts for a theme
 * 
 * @param themeSlug - The theme slug (e.g., 'grocery', 'hexfashion')
 * @returns Theme defaults or null if theme not found
 */
export function getThemeDefaults(themeSlug: string): ThemeDefaults | null {
  const defaults: Record<string, ThemeDefaults> = {
    // Grocery Theme - Fresh, vibrant colors for food/grocery stores
    grocery: {
      colors: {
        primary: '#4CAF50',      // Fresh green
        secondary: '#FF9800',    // Orange accent
        accent: '#8BC34A',       // Light green
        background: '#FFFFFF',   // White background
        text: '#212121',         // Dark gray text
        muted: '#757575',        // Medium gray
      },
      fonts: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseFontSize: 16,
        headingWeight: 700,
        bodyWeight: 400,
      },
    },

    // HexFashion Theme - Modern fashion colors
    hexfashion: {
      colors: {
        primary: '#F04751',      // Fashion red
        secondary: '#FF805D',    // Coral orange
        accent: '#599A8D',       // Teal accent
        background: '#FFFFFF',
        text: '#1A1A1A',
        muted: '#666666',
      },
      fonts: {
        headingFont: 'Playfair Display',
        bodyFont: 'Inter',
        baseFontSize: 16,
        headingWeight: 700,
        bodyWeight: 400,
      },
    },

    // Furnito Theme - Warm, earthy tones for furniture
    furnito: {
      colors: {
        primary: '#8B4513',      // Brown
        secondary: '#D2691E',     // Chocolate
        accent: '#CD853F',       // Peru
        background: '#FAF5F0',   // Warm beige
        text: '#3E2723',         // Dark brown
        muted: '#795548',        // Brown gray
      },
      fonts: {
        headingFont: 'Merriweather',
        bodyFont: 'Lato',
        baseFontSize: 16,
        headingWeight: 700,
        bodyWeight: 400,
      },
    },

    // Medicom Theme - Medical/healthcare professional colors
    medicom: {
      colors: {
        primary: '#2196F3',       // Medical blue
        secondary: '#00BCD4',    // Cyan
        accent: '#4CAF50',       // Health green
        background: '#FFFFFF',
        text: '#212121',
        muted: '#607D8B',        // Blue gray
      },
      fonts: {
        headingFont: 'Roboto',
        bodyFont: 'Roboto',
        baseFontSize: 16,
        headingWeight: 500,
        bodyWeight: 400,
      },
    },

    // BookPoint Theme - Literary, classic colors
    bookpoint: {
      colors: {
        primary: '#5D4037',       // Brown
        secondary: '#8D6E63',    // Brown gray
        accent: '#A1887F',       // Light brown
        background: '#FFF8E1',   // Warm yellow
        text: '#3E2723',         // Dark brown
        muted: '#6D4C41',        // Brown
      },
      fonts: {
        headingFont: 'Crimson Text',
        bodyFont: 'Lora',
        baseFontSize: 17,
        headingWeight: 600,
        bodyWeight: 400,
      },
    },

    // Casual Theme - Relaxed, friendly colors
    casual: {
      colors: {
        primary: '#FF6B6B',       // Coral red
        secondary: '#4ECDC4',    // Turquoise
        accent: '#FFE66D',       // Yellow
        background: '#FFFFFF',
        text: '#2C3E50',         // Dark blue gray
        muted: '#7F8C8D',        // Gray
      },
      fonts: {
        headingFont: 'Nunito',
        bodyFont: 'Open Sans',
        baseFontSize: 16,
        headingWeight: 700,
        bodyWeight: 400,
      },
    },

    // Aromatic Theme - Perfume/beauty elegant colors
    aromatic: {
      colors: {
        primary: '#9C27B0',      // Purple
        secondary: '#E91E63',    // Pink
        accent: '#FF4081',       // Pink accent
        background: '#FCE4EC',   // Light pink
        text: '#1A1A1A',
        muted: '#880E4F',        // Deep pink
      },
      fonts: {
        headingFont: 'Dancing Script',
        bodyFont: 'Cormorant Garamond',
        baseFontSize: 16,
        headingWeight: 600,
        bodyWeight: 400,
      },
    },

    // Electro Theme - Electronics, tech colors
    electro: {
      colors: {
        primary: '#1976D2',      // Blue
        secondary: '#00BCD4',    // Cyan
        accent: '#FFC107',       // Amber
        background: '#FFFFFF',
        text: '#212121',
        muted: '#546E7A',        // Blue gray
      },
      fonts: {
        headingFont: 'Roboto',
        bodyFont: 'Roboto',
        baseFontSize: 16,
        headingWeight: 500,
        bodyWeight: 400,
      },
    },

    // Modern Theme - Clean, contemporary
    modern: {
      colors: {
        primary: '#000000',      // Black
        secondary: '#666666',    // Gray
        accent: '#FF6B35',       // Orange
        background: '#FFFFFF',
        text: '#1A1A1A',
        muted: '#999999',
      },
      fonts: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseFontSize: 16,
        headingWeight: 600,
        bodyWeight: 400,
      },
    },

    // Minimal Theme - Minimalist, simple
    minimal: {
      colors: {
        primary: '#2C3E50',      // Dark blue gray
        secondary: '#34495E',    // Dark gray
        accent: '#3498DB',       // Blue
        background: '#FFFFFF',
        text: '#2C3E50',
        muted: '#7F8C8D',
      },
      fonts: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseFontSize: 16,
        headingWeight: 500,
        bodyWeight: 400,
      },
    },

    // Default Theme - Fallback for unknown themes
    default: {
      colors: {
        primary: '#0066CC',      // Blue
        secondary: '#00A8E8',    // Light blue
        accent: '#4A90E2',       // Medium blue
        background: '#FFFFFF',
        text: '#1E293B',         // Dark slate
        muted: '#64748B',        // Slate gray
      },
      fonts: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseFontSize: 16,
        headingWeight: 600,
        bodyWeight: 400,
      },
    },
  };

  // Return theme-specific defaults or default theme
  return defaults[themeSlug.toLowerCase()] || defaults.default;
}

/**
 * Get all available theme slugs with defaults
 */
export function getAvailableThemeSlugs(): string[] {
  return [
    'grocery',
    'hexfashion',
    'furnito',
    'medicom',
    'bookpoint',
    'casual',
    'aromatic',
    'electro',
    'modern',
    'minimal',
    'default',
  ];
}
