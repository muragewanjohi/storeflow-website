/**
 * Theme Styles Server Component
 * 
 * Injects theme colors as inline CSS in the HTML head to prevent FOUC (Flash of Unstyled Content)
 * This runs server-side and applies colors before the page renders
 */

import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';
import { getTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

/** Avoid DB work on error/static routes (middleware sets `x-pathname`). */
const THEME_STYLES_SKIP_PATH_PREFIXES = [
  '/404',
  '/tenant-suspended',
  '/tenant-expired',
  '/auth/',
  '/api/',
  '/_next/',
] as const;

const PRISMA_THEME_QUERY_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

/** Postgres UUID string — Prisma rejects non-UUID values with `Invalid ... invocation`. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTenantUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

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
    const headerList = await headers();
    const pathname = headerList.get('x-pathname') || '';
    if (
      pathname &&
      THEME_STYLES_SKIP_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix),
      )
    ) {
      return null;
    }

    // Use getTenant() instead of requireTenant() to gracefully handle marketing sites
    // Marketing sites (like dukanest-website) don't have tenants and should skip theme styles
    const tenant = await getTenant();

    // If no tenant (e.g., marketing site), return null - no theme styles needed
    if (!tenant) {
      return null;
    }

    // Invalid or missing tenant id breaks Prisma UUID filters and surfaces as "Invalid ... invocation"
    if (!isTenantUuid(tenant.id)) {
      console.warn('[ThemeStylesServer] Skipping: tenant.id is not a valid UUID', {
        subdomain: tenant.subdomain,
        idPreview: String(tenant.id).slice(0, 24),
      });
      return null;
    }

    const tenantId = tenant.id.trim();

    let tenantTheme;
    try {
      tenantTheme = await withTimeout(
        prisma.tenant_themes.findFirst({
          where: {
            tenant_id: tenantId,
            is_active: true,
          },
        }),
        PRISMA_THEME_QUERY_MS,
        'tenant_themes.findFirst',
      );
    } catch (dbError) {
      logThemeStylesDbError('tenant_themes.findFirst', dbError);
      return null;
    }

    if (!tenantTheme) {
      return null;
    }

    // Fetch the theme separately
    let theme;
    try {
      theme = await withTimeout(
        prisma.themes.findUnique({
          where: { id: tenantTheme.theme_id },
        }),
        PRISMA_THEME_QUERY_MS,
        'themes.findUnique',
      );
    } catch (dbError) {
      logThemeStylesDbError('themes.findUnique', dbError);
      return null;
    }

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
    logThemeStylesDbError('ThemeStylesServer', error);
    return null;
  }
}

function isTimeoutLike(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as { code?: string; message?: string };
  const code = String(anyErr.code || '');
  const msg = String(anyErr.message || '');
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    /ETIMEDOUT|timed out|timeout/i.test(msg)
  );
}

function logThemeStylesDbError(context: string, error: unknown): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const hint =
      error.code === 'P2021'
        ? ' Table missing in DB — run `npx prisma db push` or apply migrations so `tenant_themes` exists.'
        : '';
    console.error(`[ThemeStylesServer] ${context} (${error.code}):`, error.message, hint);
    return;
  }

  if (isTimeoutLike(error)) {
    console.warn(
      `[ThemeStylesServer] ${context}: database unreachable or slow (timeout). ` +
        'Check DATABASE_URL, that Postgres is running, and network/VPN/firewall. Theme CSS skipped for this request.',
      error,
    );
    return;
  }

  console.error(`[ThemeStylesServer] ${context}:`, error);
}
