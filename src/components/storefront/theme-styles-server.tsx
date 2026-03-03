/**
 * Theme Styles Server Component
 * 
 * Injects theme colors as inline CSS in the HTML head to prevent FOUC (Flash of Unstyled Content)
 * This runs server-side and applies colors before the page renders
 */

import { getTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

// Helper function to convert hex to HSL for Tailwind CSS variables
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

export default async function ThemeStylesServer() {
  try {
    // Use getTenant() instead of requireTenant() to gracefully handle marketing sites
    // Marketing sites (like dukanest-website) don't have tenants and should skip theme styles
    const tenant = await getTenant();
    
    // If no tenant (e.g., marketing site), return null - no theme styles needed
    if (!tenant) {
      return null;
    }

    const tenantTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenant.id,
        is_active: true,
      },
    });

    if (!tenantTheme) {
      return null;
    }

    // Fetch the theme separately
    const theme = await prisma.themes.findUnique({
      where: { id: tenantTheme.theme_id },
    });

    if (!theme) {
      return null;
    }

    // Merge theme colors with customizations
    const themeColors = (theme.colors as Record<string, string>) || {};
    const customColors = (tenantTheme.custom_colors as Record<string, string>) || {};
    const colors = { ...themeColors, ...customColors };

    // Build CSS variables
    const cssVariables: string[] = [];

    // Apply color CSS variables
    Object.entries(colors)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.trim()) {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        cssVariables.push(`--color-${cssKey}: ${value};`);
        
        // Also set as Tailwind CSS variables (convert hex to HSL format)
        if (key === 'primary') {
          const hslValue = hexToHsl(value);
          // Only set primary if buttonBackground is not set (buttonBackground will override)
          if (!colors.buttonBackground) {
            cssVariables.push(`--primary: ${hslValue};`);
          }
        }
        if (key === 'secondary') {
          const hslValue = hexToHsl(value);
          cssVariables.push(`--secondary: ${hslValue};`);
          // Use text color for secondary-foreground
          const textColor = colors.text || '#FFFFFF';
          const textHsl = hexToHsl(textColor);
          cssVariables.push(`--secondary-foreground: ${textHsl};`);
        }
        if (key === 'accent') {
          const hslValue = hexToHsl(value);
          cssVariables.push(`--accent: ${hslValue};`);
          // Use text color for accent-foreground
          const textColor = colors.text || '#FFFFFF';
          const textHsl = hexToHsl(textColor);
          cssVariables.push(`--accent-foreground: ${textHsl};`);
        }
        if (key === 'background') {
          const hslValue = hexToHsl(value);
          cssVariables.push(`--background: ${hslValue};`);
        }
        if (key === 'text') {
          const hslValue = hexToHsl(value);
          cssVariables.push(`--foreground: ${hslValue};`);
        }
        if (key === 'muted') {
          const hslValue = hexToHsl(value);
          cssVariables.push(`--muted: ${hslValue};`);
          cssVariables.push(`--muted-foreground: ${hslValue};`);
        }
        if (key === 'buttonBackground') {
          const hslValue = hexToHsl(value);
          cssVariables.push(`--button-background: ${hslValue};`);
        }
        if (key === 'buttonText') {
          const hslValue = hexToHsl(value);
          cssVariables.push(`--button-text: ${hslValue};`);
        }
      }
    });

    // After processing all colors, apply button colors to primary/primary-foreground for buttons
    if (colors.buttonBackground && typeof colors.buttonBackground === 'string' && colors.buttonBackground.trim()) {
      const buttonBgHsl = hexToHsl(colors.buttonBackground);
      cssVariables.push(`--primary: ${buttonBgHsl};`);
    }
    
    // Always set primary-foreground: use buttonText if available, otherwise use text color, otherwise white
    if (colors.buttonText && typeof colors.buttonText === 'string' && colors.buttonText.trim()) {
      const buttonTextHsl = hexToHsl(colors.buttonText);
      cssVariables.push(`--primary-foreground: ${buttonTextHsl};`);
    } else {
      // Fallback to text color or white if buttonText is not set
      const textColor = colors.text || '#FFFFFF';
      const textHsl = hexToHsl(textColor);
      cssVariables.push(`--primary-foreground: ${textHsl};`);
    }

    // Apply typography
    const themeTypography = (theme.typography as Record<string, string | number>) || {};
    const customTypography = (tenantTheme.custom_fonts as Record<string, string | number>) || {};
    const typography = { ...themeTypography, ...customTypography };

    if (typography.headingFont) {
      cssVariables.push(`--font-heading: ${String(typography.headingFont)};`);
    }
    if (typography.bodyFont) {
      cssVariables.push(`--font-body: ${String(typography.bodyFont)};`);
    }
    if (typography.baseFontSize) {
      cssVariables.push(`--font-size-base: ${typography.baseFontSize}px;`);
    }

    // Apply layout variables
    const layouts = (tenantTheme.custom_layouts as Record<string, string | number>) || {};
    if (layouts.containerMaxWidth) {
      cssVariables.push(`--container-max-width: ${layouts.containerMaxWidth}px;`);
    }

    // Generate the CSS string
    const cssString = `:root { ${cssVariables.join(' ')} }`;

    return (
      <style
        id="theme-styles-server"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: cssString }}
      />
    );
  } catch (error) {
    // Silently fail - theme will be applied client-side
    console.error('Error generating theme styles server-side:', error);
    return null;
  }
}
