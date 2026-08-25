'use client';

/**
 * Public Theme Preview — client half. See page.tsx's docblock for why
 * this exists. Deliberately minimal: just Header + Homepage + Footer with
 * real demo content and the theme's real colors/typography applied as CSS
 * variables — no install/activate actions, no multi-page navigation, no
 * tenant-specific state. A trimmed-down sibling of the authenticated
 * /dashboard/themes/preview/[themeId] client, reusing the exact same
 * @/lib/themes/theme-loader dynamic component loaders and the same public
 * GET /api/themes/{id}/demo-content endpoint that page already uses.
 */

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadThemeHeader, loadThemeFooter, loadThemeHomepage } from '@/lib/themes/theme-loader';
import { PreviewProvider } from '@/lib/themes/preview-context';

interface Theme {
  id: string;
  slug: string;
  title: string;
  colors: Record<string, unknown> | null;
  typography: Record<string, unknown> | null;
}

export default function ThemePublicPreviewClient({ theme }: Readonly<{ theme: Theme }>) {
  const ThemeHeader = useMemo(() => loadThemeHeader(theme.slug), [theme.slug]);
  const ThemeFooter = useMemo(() => loadThemeFooter(theme.slug), [theme.slug]);
  const ThemeHomepage = useMemo(() => loadThemeHomepage(theme.slug), [theme.slug]);

  // Grocery's real registered theme is branded "Multipurpose" in its real
  // demo/marketing surfaces (theme-preview-client.tsx, src/app/themes/
  // multipurpose/) — matching that same fashion-industry demo-content
  // override here for consistency, not a new decision.
  const demoIndustryOverride = theme.slug === 'grocery' ? 'fashion' : undefined;

  const { data: demoContent, isLoading } = useQuery({
    queryKey: ['public-theme-demo-content', theme.id, demoIndustryOverride],
    queryFn: async () => {
      const url = demoIndustryOverride
        ? `/api/themes/${theme.id}/demo-content?industry=${demoIndustryOverride}`
        : `/api/themes/${theme.id}/demo-content`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to fetch demo content: ${response.statusText}`);
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    const root = document.documentElement;
    const colors = (theme.colors || {}) as Record<string, string>;
    Object.entries(colors).forEach(([key, value]) => {
      if (!value) return;
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--color-${cssKey}`, value);
      if (key === 'primary') root.style.setProperty('--primary', value);
      if (key === 'secondary') root.style.setProperty('--secondary', value);
      if (key === 'accent') root.style.setProperty('--accent', value);
    });

    const typography = (theme.typography || {}) as Record<string, string | number>;
    if (typography.headingFont) root.style.setProperty('--font-heading', String(typography.headingFont));
    if (typography.bodyFont) root.style.setProperty('--font-body', String(typography.bodyFont));
    if (typography.baseFontSize) root.style.setProperty('--font-size-base', `${typography.baseFontSize}px`);

    return () => {
      Object.keys(colors).forEach((key) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.removeProperty(`--color-${cssKey}`);
      });
    };
  }, [theme]);

  if (isLoading || !demoContent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading preview...
      </div>
    );
  }

  return (
    <PreviewProvider isPreview previewBrandName={theme.slug === 'grocery' ? 'Multipurpose' : undefined} previewIndustry={demoIndustryOverride}>
      <div className="min-h-screen flex flex-col">
        <ThemeHeader />
        <main className="flex-1">
          {ThemeHomepage ? (
            <ThemeHomepage products={demoContent.products || []} categories={demoContent.categories || []} />
          ) : (
            <div className="py-16 text-center text-muted-foreground">This theme has no Homepage component.</div>
          )}
        </main>
        <ThemeFooter />
      </div>
    </PreviewProvider>
  );
}
