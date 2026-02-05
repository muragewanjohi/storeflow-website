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
    // Grocery Theme - E-commerce-friendly color scheme (based on Figma & Shopify best practices)
    grocery: {
      colors: {
        primary: '#4CAF50',      // Green - trust and action (e-commerce friendly)
        secondary: '#10b981',    // Emerald - complements primary
        accent: '#FF9800',       // Orange - use sparingly for emphasis
        background: '#FFFFFF',   // White background - clean and professional
        text: '#212121',         // Dark gray text - optimal contrast
        muted: '#6B7280',        // Medium gray - 40-60% lighter than text for visibility
        buttonBackground: '#4CAF50', // Green button background - matches primary
        buttonText: '#FFFFFF',   // White button text - optimal contrast
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
        buttonBackground: '#F04751', // Fashion red button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#8B4513', // Brown button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#2196F3', // Medical blue button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#5D4037', // Brown button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#FF6B6B', // Coral red button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#9C27B0', // Purple button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#1976D2', // Blue button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#000000', // Black button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#2C3E50', // Dark blue gray button background
        buttonText: '#FFFFFF',   // White button text
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
        buttonBackground: '#0066CC', // Blue button background
        buttonText: '#FFFFFF',   // White button text
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

/**
 * Get color scheme based on business type
 * Returns color scheme that will override theme defaults
 */
export function getBusinessTypeColorScheme(businessType: string): Partial<ThemeColors> | null {
  if (!businessType) return null;

  const type = businessType.toLowerCase();

  // Grocery Store / Supermarket
  if (type.includes('grocery') || type.includes('supermarket')) {
    return {
      primary: '#4CAF50',      // Fresh green
      secondary: '#2E7D32',     // Dark green
      accent: '#FF9800',        // Warm orange
      buttonBackground: '#4CAF50',
      buttonText: '#FFFFFF',
    };
  }

  // Pharmacy / Health & Wellness (inspired by Medi-Cure template)
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    return {
      primary: '#009688',        // Healthcare teal - trust and professionalism
      secondary: '#4DB6AC',      // Light teal - softer, welcoming (from Medi-Cure)
      accent: '#FF9800',         // Orange - for CTAs and emphasis
      buttonBackground: '#009688',
      buttonText: '#FFFFFF',
    };
  }

  // Fashion / Clothing
  if (type.includes('fashion') || type.includes('clothing')) {
    return {
      primary: '#212121',       // Modern black
      secondary: '#757575',     // Elegant gray
      accent: '#E91E63',        // Pink accent
      buttonBackground: '#212121',
      buttonText: '#FFFFFF',
    };
  }

  // Electronics & Mobile Phones
  if (type.includes('electronics') || type.includes('mobile') || type.includes('phones')) {
    return {
      primary: '#2196F3',       // Tech blue
      secondary: '#424242',      // Dark gray
      accent: '#FF5722',        // Vibrant orange
      buttonBackground: '#2196F3',
      buttonText: '#FFFFFF',
    };
  }

  // Beauty & Personal Care
  if (type.includes('beauty') || type.includes('personal care')) {
    return {
      primary: '#F8BBD0',        // Soft pink
      secondary: '#CE93D8',     // Elegant purple
      accent: '#E91E63',        // Pink accent
      buttonBackground: '#E91E63',
      buttonText: '#FFFFFF',
    };
  }

  // Home & Kitchen
  if (type.includes('home') || type.includes('kitchen')) {
    return {
      primary: '#8D6E63',       // Warm brown
      secondary: '#FF7043',    // Cozy orange
      accent: '#66BB6A',       // Fresh green
      buttonBackground: '#8D6E63',
      buttonText: '#FFFFFF',
    };
  }

  // Baby & Kids Products
  if (type.includes('baby') || type.includes('kids')) {
    return {
      primary: '#F48FB1',       // Soft pink
      secondary: '#90CAF9',     // Soft blue
      accent: '#FFF59D',        // Soft yellow
      buttonBackground: '#F48FB1',
      buttonText: '#FFFFFF',
    };
  }

  // Food & Beverages / Restaurant
  if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
    return {
      primary: '#E53935',       // Appetizing red
      secondary: '#FF6F00',     // Warm orange
      accent: '#66BB6A',        // Fresh green
      buttonBackground: '#E53935',
      buttonText: '#FFFFFF',
    };
  }

  // Convenience Store / Duka
  if (type.includes('convenience') || type.includes('duka')) {
    return {
      primary: '#42A5F5',       // Friendly blue
      secondary: '#66BB6A',    // Accessible green
      accent: '#FFC107',        // Warm yellow
      buttonBackground: '#42A5F5',
      buttonText: '#FFFFFF',
    };
  }

  // Furniture & Home Decor
  if (type.includes('furniture') || type.includes('home decor')) {
    return {
      primary: '#6D4C41',       // Rich brown
      secondary: '#616161',     // Elegant gray
      accent: '#FFD700',        // Accent gold
      buttonBackground: '#6D4C41',
      buttonText: '#FFFFFF',
    };
  }

  // Pets
  if (type.includes('pet')) {
    return {
      primary: '#FF6B9D',       // Playful pink
      secondary: '#4ECDC4',    // Friendly turquoise
      accent: '#FFE66D',       // Energetic yellow
      buttonBackground: '#FF6B9D',
      buttonText: '#FFFFFF',
    };
  }

  // Hardware
  if (type.includes('hardware')) {
    return {
      primary: '#37474F',       // Industrial gray-blue
      secondary: '#546E7A',    // Steel gray
      accent: '#FF6F00',        // Orange accent
      buttonBackground: '#37474F',
      buttonText: '#FFFFFF',
    };
  }

  // Shoes / Footwear
  if (type.includes('shoes') || type.includes('footwear')) {
    return {
      primary: '#007BFF',        // Vibrant blue
      secondary: '#FF4500',      // Orange red
      accent: '#DC3545',         // Red accent
      background: '#FFFFFF',     // White background
      text: '#212529',           // Dark text
      muted: '#6C757D',          // Gray muted
      buttonBackground: '#0066CC', // Blue button
      buttonText: '#FFFFFF',     // White button text
    };
  }

  // Default/Other - use neutral colors
  return {
    primary: '#0066CC',         // Standard blue
    secondary: '#00A8E8',      // Light blue
    accent: '#4A90E2',         // Medium blue
    buttonBackground: '#0066CC',
    buttonText: '#FFFFFF',
  };
}
