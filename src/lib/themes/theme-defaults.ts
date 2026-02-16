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

  // Grocery Store / Supermarket (Whole Foods, fresh produce - green = freshness, trust)
  if (type.includes('grocery') || type.includes('supermarket')) {
    return {
      primary: '#4CAF50',      // Fresh green - industry standard for produce/freshness
      secondary: '#2E7D32',    // Dark green - depth
      accent: '#FF9800',       // Warm orange - CTAs and promotions
      background: '#FFFFFF',
      buttonBackground: '#4CAF50',
      buttonText: '#FFFFFF',
    };
  }

  // Pharmacy / Health & Wellness (Walgreens, CVS - blue/teal = trust, 85% of healthcare uses blue)
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    return {
      primary: '#009688',       // Teal - trust, care, professionalism
      secondary: '#4DB6AC',     // Light teal - welcoming
      accent: '#FF9800',        // Orange - CTAs
      background: '#FFFFFF',
      buttonBackground: '#009688',
      buttonText: '#FFFFFF',
    };
  }

  // Fashion / Clothing (Zara, Nike, luxury - black/white = sophistication)
  if (type.includes('fashion') || type.includes('clothing')) {
    return {
      primary: '#000000',       // Black - luxury standard (Chanel, Nike, YSL)
      secondary: '#757575',     // Elegant gray
      accent: '#E91E63',        // Pink accent - Hermès-style differentiation
      background: '#FFFFFF',
      buttonBackground: '#000000',
      buttonText: '#FFFFFF',
    };
  }

  // Electronics & Mobile Phones (Amazon, Best Buy - blue = trust, orange = action)
  if (type.includes('electronics') || type.includes('mobile') || type.includes('phones')) {
    return {
      primary: '#146EB4',       // Amazon blue - trust, recognition
      secondary: '#232F3E',     // Dark gray - tech feel
      accent: '#FF9900',        // Amazon orange - CTAs
      background: '#FFFFFF',
      buttonBackground: '#146EB4',
      buttonText: '#FFFFFF',
    };
  }

  // Beauty & Personal Care (inspired by Sephora, Ulta, luxury beauty ecommerce)
  if (type.includes('beauty') || type.includes('personal care')) {
    return {
      primary: '#E91E63',        // Material Pink 500 - strong, premium (not pastel)
      secondary: '#9C27B0',      // Purple - elegant complement
      accent: '#FF4081',         // Pink accent - vibrant for CTAs
      background: '#FFFFFF',    // Clean white - product-focused
      buttonBackground: '#E91E63',
      buttonText: '#FFFFFF',
    };
  }

  // Home & Kitchen (IKEA, Wayfair - warm browns = cozy, timeless)
  if (type.includes('home') || type.includes('kitchen')) {
    return {
      primary: '#6D4C41',       // Rich brown - 2025 furniture trend
      secondary: '#8D6E63',    // Warm brown gray
      accent: '#FF7043',       // Cozy orange - warmth
      background: '#FFFFFF',
      buttonBackground: '#6D4C41',
      buttonText: '#FFFFFF',
    };
  }

  // Baby & Kids Products (pastels = gentle, nurturing - industry standard)
  if (type.includes('baby') || type.includes('kids')) {
    return {
      primary: '#F48FB1',       // Soft pink - gentle
      secondary: '#90CAF9',     // Soft blue - calming
      accent: '#CE93D8',       // Lavender - soft complement
      background: '#FFFFFF',
      buttonBackground: '#F48FB1',
      buttonText: '#FFFFFF',
    };
  }

  // Food & Beverages / Restaurant (DoorDash, Grubhub - red/orange = appetite, urgency)
  if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
    return {
      primary: '#E53935',       // Red - stimulates appetite, urgency
      secondary: '#FF6F00',     // Orange - warmth, excitement
      accent: '#FF9800',        // Amber - CTAs
      background: '#FFFFFF',
      buttonBackground: '#E53935',
      buttonText: '#FFFFFF',
    };
  }

  // Convenience Store / Duka (friendly, accessible - blue/green = trust, freshness)
  if (type.includes('convenience') || type.includes('duka')) {
    return {
      primary: '#1C49C2',       // Chewy-style blue - trust, recognition
      secondary: '#4CAF50',    // Green - freshness, accessibility
      accent: '#FFC107',       // Warm yellow - promotions
      background: '#FFFFFF',
      buttonBackground: '#1C49C2',
      buttonText: '#FFFFFF',
    };
  }

  // Furniture & Home Decor (IKEA, Wayfair - browns, warm earth tones)
  if (type.includes('furniture') || type.includes('home decor')) {
    return {
      primary: '#5D4037',       // Dark brown - timeless, natural
      secondary: '#8D6E63',     // Warm brown gray
      accent: '#D4AF37',        // Gold - premium accent
      background: '#FFFFFF',
      buttonBackground: '#5D4037',
      buttonText: '#FFFFFF',
    };
  }

  // Pets (Petco, Chewy - blue = trust, green = nature)
  if (type.includes('pet')) {
    return {
      primary: '#1C49C2',       // Chewy blue - trust, pet industry standard
      secondary: '#4CAF50',     // Green - nature, pets, vitality
      accent: '#FF9800',       // Orange - friendly, energetic
      background: '#FFFFFF',
      buttonBackground: '#1C49C2',
      buttonText: '#FFFFFF',
    };
  }

  // Hardware (Home Depot - orange = iconic, Lowe's = blue)
  if (type.includes('hardware')) {
    return {
      primary: '#F77000',       // Home Depot orange - industry recognition
      secondary: '#37474F',     // Industrial gray - tools, metal
      accent: '#FF9800',        // Warm orange - CTAs
      background: '#FFFFFF',
      buttonBackground: '#F77000',
      buttonText: '#FFFFFF',
    };
  }

  // Shoes / Footwear (Nike, Adidas - black/white = athletic, premium)
  if (type.includes('shoes') || type.includes('footwear')) {
    return {
      primary: '#000000',       // Black - Nike, Adidas athletic standard
      secondary: '#424242',     // Dark gray
      accent: '#FF6700',        // Nike orange - energy, sport
      background: '#FFFFFF',
      buttonBackground: '#000000',
      buttonText: '#FFFFFF',
    };
  }

  // Default/Other - neutral, trustworthy blue
  return {
    primary: '#0066CC',
    secondary: '#00A8E8',
    accent: '#4A90E2',
    background: '#FFFFFF',
    buttonBackground: '#0066CC',
    buttonText: '#FFFFFF',
  };
}
