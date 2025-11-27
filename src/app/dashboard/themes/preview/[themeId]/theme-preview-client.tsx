'use client';

/**
 * Theme Preview Client Component
 * 
 * Renders a preview of the storefront with the selected theme
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';

interface Theme {
  id: string;
  title: string;
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
      Object.keys(colors).forEach((key) => {
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

      {/* Preview Content - Mock Storefront */}
      <div className="min-h-screen flex flex-col">
        <StorefrontHeader />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-20">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                Welcome to Our Store
              </h1>
              <p className="text-xl text-muted-foreground mb-8" style={{ fontFamily: 'var(--font-body, inherit)' }}>
                Discover amazing products with {theme.title}
              </p>
              <Button size="lg">Shop Now</Button>
            </div>
          </section>

          {/* Featured Products Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                Featured Products
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
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
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 bg-muted/50">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🚚</span>
                  </div>
                  <h3 className="font-semibold mb-2">Free Shipping</h3>
                  <p className="text-sm text-muted-foreground">On orders over $50</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">↩️</span>
                  </div>
                  <h3 className="font-semibold mb-2">Easy Returns</h3>
                  <p className="text-sm text-muted-foreground">30-day return policy</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="font-semibold mb-2">Secure Payment</h3>
                  <p className="text-sm text-muted-foreground">100% secure checkout</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <StorefrontFooter />
      </div>
    </div>
  );
}

