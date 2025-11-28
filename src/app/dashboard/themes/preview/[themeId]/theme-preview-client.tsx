'use client';

/**
 * Theme Preview Client Component
 * 
 * Renders a full site preview of the storefront with the selected theme and demo content
 * Day 37: Theme Templates with Demo Content
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getThemeTemplate } from '@/lib/themes/theme-registry';
import { loadThemeHeader, loadThemeFooter, loadThemeHero, loadThemeProductGrid } from '@/lib/themes/theme-loader';
import { useQuery } from '@tanstack/react-query';

interface Theme {
  id: string;
  title: string;
  slug: string;
  colors: Record<string, unknown> | null;
  typography: Record<string, unknown> | null;
}

interface Customizations {
  custom_colors?: Record<string, unknown> | null;
  custom_fonts?: Record<string, unknown> | null;
  custom_layouts?: Record<string, unknown> | null;
}

interface ThemePreviewClientProps {
  theme: Theme;
  customizations: Customizations | null;
}

export default function ThemePreviewClient({
  theme,
  customizations,
}: ThemePreviewClientProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<'home' | 'products' | 'product-detail'>('home');
  
  // Get theme template
  const template = getThemeTemplate(theme.slug);
  
  // Load theme-specific components (these are dynamic imports that return component constructors)
  const ThemeHeader = loadThemeHeader(theme.slug);
  const ThemeFooter = loadThemeFooter(theme.slug);
  const ThemeHero = loadThemeHero(theme.slug);
  const ThemeProductGrid = loadThemeProductGrid(theme.slug);
  
  // Fetch demo content
  const { data: demoContent, isLoading: isLoadingDemo } = useQuery({
    queryKey: ['theme-demo-content', theme.id],
    queryFn: async () => {
      const response = await fetch(`/api/themes/${theme.id}/demo-content`);
      if (!response.ok) throw new Error('Failed to fetch demo content');
      return await response.json();
    },
  });

  // Apply theme styles
  useEffect(() => {
    const root = document.documentElement;
    
    // Merge theme colors with customizations
    const themeColors = (theme.colors || {}) as Record<string, string>;
    const customColors = (customizations?.custom_colors || {}) as Record<string, string>;
    const colors = { ...themeColors, ...customColors };

    // Apply color CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(`--color-${cssKey}`, value);
        // Also set as CSS custom property for Tailwind
        if (key === 'primary') root.style.setProperty('--primary', value);
        if (key === 'secondary') root.style.setProperty('--secondary', value);
        if (key === 'accent') root.style.setProperty('--accent', value);
      }
    });

    // Apply typography
    const themeTypography = (theme.typography || {}) as Record<string, string | number>;
    const customTypography = (customizations?.custom_fonts || {}) as Record<string, string | number>;
    const typography = { ...themeTypography, ...customTypography };

    if (typography.headingFont) {
      root.style.setProperty('--font-heading', String(typography.headingFont));
    }
    if (typography.bodyFont) {
      root.style.setProperty('--font-body', String(typography.bodyFont));
    }
    if (typography.baseFontSize) {
      root.style.setProperty('--font-size-base', `${typography.baseFontSize}px`);
    }

    return () => {
      // Cleanup on unmount
      Object.keys(colors).forEach((key: any) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.removeProperty(`--color-${cssKey}`);
      });
    };
  }, [theme, customizations]);

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Header */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold">Preview: {theme.title}</h1>
              <p className="text-sm text-muted-foreground">
                This is how your storefront will look with this theme
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/themes')}
          >
            Back to Themes
          </Button>
        </div>
      </div>

      {/* Preview Content - Full Site with Theme Components */}
      <div className="min-h-screen flex flex-col">
        <ThemeHeader />
        
        <main className="flex-1">
          {currentPage === 'home' && (
            <>
              {/* Hero Section with Theme Component */}
              {ThemeHero && (
                <ThemeHero
                  title={template?.industry === 'electronics' 
                    ? 'Latest Technology at Your Fingertips'
                    : template?.industry === 'fashion'
                    ? 'Timeless Fashion, Modern Style'
                    : 'Welcome to Our Store'}
                  subtitle={template?.industry === 'electronics'
                    ? 'Discover cutting-edge electronics and gadgets for your digital lifestyle'
                    : template?.industry === 'fashion'
                    ? 'Discover our curated collection of elegant pieces designed for the modern wardrobe'
                    : 'Discover amazing products'}
                  ctaText="Shop Now"
                  ctaLink="#"
                />
              )}

              {/* Featured Products Section with Theme Product Grid */}
              <section className="py-16">
                <div className="container mx-auto px-4">
                  <h2 className="text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                    Featured Products
                  </h2>
                  {isLoadingDemo ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map((i: any) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="aspect-square bg-muted animate-pulse" />
                          <CardContent className="p-4">
                            <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : demoContent?.products && ThemeProductGrid ? (
                    <ThemeProductGrid
                      products={demoContent.products.slice(0, 8).map((p: any) => ({
                        id: p.sku,
                        name: p.name,
                        slug: p.sku.toLowerCase().replace(/\s+/g, '-'),
                        price: p.price,
                        compareAtPrice: p.compareAtPrice,
                        image: p.image,
                        stock_quantity: p.stock_quantity,
                        metadata: p.metadata,
                      }))}
                      columns={4}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map((i: any) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="aspect-square bg-muted" />
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-2">Product {i}</h3>
                            <p className="text-sm text-muted-foreground mb-2">Sample product description</p>
                            <p className="text-lg font-bold">${(i * 10).toFixed(2)}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage('products')}
                    >
                      View All Products
                    </Button>
                  </div>
                </div>
              </section>
            </>
          )}

          {currentPage === 'products' && (
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold">All Products</h2>
                  <Button variant="ghost" onClick={() => setCurrentPage('home')}>
                    Back to Home
                  </Button>
                </div>
                {isLoadingDemo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i: any) => (
                      <Card key={i} className="overflow-hidden">
                        <div className="aspect-square bg-muted animate-pulse" />
                      </Card>
                    ))}
                  </div>
                ) : demoContent?.products && ThemeProductGrid ? (
                  <ThemeProductGrid
                    products={demoContent.products.map((p: any) => ({
                      id: p.sku,
                      name: p.name,
                      slug: p.sku.toLowerCase().replace(/\s+/g, '-'),
                      price: p.price,
                      compareAtPrice: p.compareAtPrice,
                      image: p.image,
                      stock_quantity: p.stock_quantity,
                      metadata: p.metadata,
                    }))}
                    columns={4}
                  />
                ) : null}
              </div>
            </section>
          )}
        </main>

        <ThemeFooter />
      </div>
    </div>
  );
}

