/**
 * Hook to get theme colors for charts
 * Converts CSS variables to hex colors for use in Recharts
 */

import { useMemo } from 'react';

/**
 * Convert HSL string (e.g., "221.2 83.2% 53.3%") to hex color
 */
function hslToHex(hsl: string): string {
  try {
    const parts = hsl.trim().split(/\s+/);
    if (parts.length !== 3) return '#0088FE'; // Fallback to default blue
    
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1].replace('%', ''));
    const l = parseFloat(parts[2].replace('%', ''));
    
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = (l / 100) - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch {
    return '#0088FE'; // Fallback
  }
}

/**
 * Get computed CSS variable value
 */
function getCSSVariable(variable: string): string {
  if (typeof window === 'undefined') return '#0088FE'; // SSR fallback
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  
  if (!value) return '#0088FE'; // Fallback
  
  // If it's HSL format, convert to hex
  if (value.includes('%') || (!value.startsWith('#') && !value.startsWith('rgb'))) {
    return hslToHex(value);
  }
  
  return value;
}

/**
 * Hook to get theme colors for charts
 */
export function useThemeColors() {
  return useMemo(() => {
    const primary = getCSSVariable('--primary');
    const secondary = getCSSVariable('--secondary');
    const accent = getCSSVariable('--accent');
    const chart1 = getCSSVariable('--chart-1');
    const chart2 = getCSSVariable('--chart-2');
    const chart3 = getCSSVariable('--chart-3');
    const chart4 = getCSSVariable('--chart-4');
    const chart5 = getCSSVariable('--chart-5');
    
    // Generate color palette using theme colors
    const colors = [
      primary,
      secondary || chart2,
      accent || chart3,
      chart4,
      chart5,
      chart1,
    ];
    
    return {
      primary,
      secondary: secondary || chart2,
      accent: accent || chart3,
      colors, // Array for pie charts and multiple series
    };
  }, []); // Empty deps - colors are read from CSS variables which update reactively
}
