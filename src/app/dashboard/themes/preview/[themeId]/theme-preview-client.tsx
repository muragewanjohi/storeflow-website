'use client';

/**
 * Theme Preview Client Component
 * 
 * Renders a full site preview of the storefront with the selected theme and demo content
 * Day 37: Theme Templates with Demo Content
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getThemeTemplate } from '@/lib/themes/theme-registry';
import { loadThemeHeader, loadThemeFooter, loadThemeHero, loadThemeProductGrid, loadThemeHomepage } from '@/lib/themes/theme-loader';
import { useQuery } from '@tanstack/react-query';
import type { DemoProduct } from '@/lib/themes/demo-content';
import { PreviewProvider } from '@/lib/themes/preview-context';

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
  const [currentPage, setCurrentPage] = useState<'home' | 'products' | 'product-detail' | 'about' | 'contact' | 'sign-in'>('home');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  
  // Get theme template
  const template = getThemeTemplate(theme.slug);
  
  // Load theme-specific components (these are dynamic imports that return component constructors)
  // Memoize to prevent unnecessary re-renders
  const ThemeHeader = useMemo(() => loadThemeHeader(theme.slug), [theme.slug]);
  const ThemeFooter = useMemo(() => loadThemeFooter(theme.slug), [theme.slug]);
  const ThemeHero = useMemo(() => loadThemeHero(theme.slug), [theme.slug]);
  const ThemeProductGrid = useMemo(() => loadThemeProductGrid(theme.slug), [theme.slug]);
  const ThemeHomepage = useMemo(() => loadThemeHomepage(theme.slug), [theme.slug]);
  
  // Fetch demo content with timeout and error handling
  // Increased timeout to account for API compilation on first request
  const { data: demoContent, isLoading: isLoadingDemo, error: demoError } = useQuery({
    queryKey: ['theme-demo-content', theme.id],
    queryFn: async () => {
      try {
        // Use a longer timeout to account for Next.js API route compilation on first request
        const response = await fetch(`/api/themes/${theme.id}/demo-content`, {
          cache: 'no-store', // Always fetch fresh in preview
          // Don't use AbortController here - let React Query handle timeouts
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch demo content: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
      } catch (error: any) {
        // Provide more helpful error messages
        if (error.message?.includes('fetch')) {
          throw new Error('Network error - please check your connection');
        }
        throw error;
      }
    },
    retry: 1, // Retry once in case of temporary failures
    retryDelay: 1000, // Wait 1 second before retry
    staleTime: 0, // Always fetch fresh
    gcTime: 0, // Don't cache
    // Increase timeout to 15 seconds to account for API compilation
    networkMode: 'online',
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
      <PreviewProvider
        isPreview={true}
        onNavigate={useCallback((path: string) => {
          // Handle navigation within preview
          if (path === '/') {
            // Home link should go to homepage
            setCurrentPage('home');
            setSelectedProduct(null);
          } else if (path === '/products' || path.startsWith('/products')) {
            if (path === '/products') {
              setCurrentPage('products');
              setSelectedProduct(null);
            } else if (path.startsWith('/products/') && demoContent?.products) {
              // Extract product slug/ID from path
              const productSlug = path.replace('/products/', '');
              const product = demoContent.products.find((p: any) => {
                const mappedSlug = p.sku.toLowerCase().replace(/\s+/g, '-');
                return mappedSlug === productSlug || p.sku === productSlug;
              });
              if (product) {
                setSelectedProduct(product);
                setCurrentPage('product-detail');
              }
            }
          } else if (path === '/about') {
            setCurrentPage('about');
            setSelectedProduct(null);
          } else if (path === '/contact') {
            setCurrentPage('contact');
            setSelectedProduct(null);
          } else if (path === '/customer-login' || path === '/sign-in') {
            setCurrentPage('sign-in');
            setSelectedProduct(null);
          }
        }, [demoContent?.products])}
        onProductClick={useCallback((productId: string) => {
          if (!demoContent?.products) return;
          const product = demoContent.products.find((p: any) => {
            const mappedId = p.sku.toLowerCase().replace(/\s+/g, '-');
            return mappedId === productId || p.sku === productId;
          });
          if (product) {
            setSelectedProduct(product);
            setCurrentPage('product-detail');
          }
        }, [demoContent?.products])}
      >
        <div className="min-h-screen flex flex-col">
          <ThemeHeader />
          
          <main className="flex-1">
          {currentPage === 'home' && (
            <>
              {demoError ? (
                <div className="py-16">
                  <div className="container mx-auto px-4 text-center">
                    <Card className="max-w-md mx-auto">
                      <CardContent className="p-6">
                        <p className="text-destructive mb-4">
                          Failed to load demo content: {demoError instanceof Error ? demoError.message : 'Unknown error'}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            window.location.reload();
                          }}
                        >
                          Retry
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : isLoadingDemo ? (
                <div className="py-16">
                  <div className="container mx-auto px-4">
                    <div className="h-96 bg-muted animate-pulse rounded-lg mb-8" />
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
                  </div>
                </div>
              ) : demoContent ? (
                // Show content immediately - try Homepage component first, fallback to basic layout
                ThemeHomepage ? (
                  <ThemeHomepage
                    products={demoContent.products || []}
                    categories={demoContent.categories || []}
                  />
                ) : (
                  // Fallback: Show content with basic layout if Homepage component isn't available yet
                  <div className="py-16">
                    <div className="container mx-auto px-4">
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
                          ctaLink="#products"
                        />
                      )}
                      <section className="py-16">
                        <div className="container mx-auto px-4">
                          <h2 className="text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                            Featured Products
                          </h2>
                          {ThemeProductGrid && demoContent.products ? (
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
                              {demoContent.products.slice(0, 8).map((p: any) => (
                                <Card key={p.sku} className="overflow-hidden">
                                  <div className="aspect-square bg-muted relative">
                                    {p.image && (
                                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                  <CardContent className="p-4">
                                    <h3 className="font-semibold mb-2">{p.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{p.description}</p>
                                    <p className="text-lg font-bold">${p.price.toFixed(2)}</p>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                )
              ) : (
                <div className="py-16">
                  <div className="container mx-auto px-4 text-center">
                    <p className="text-muted-foreground mb-4">Loading theme preview...</p>
                    <p className="text-sm text-muted-foreground">
                      {isLoadingDemo ? 'Loading demo content...' : 'Loading theme components...'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Navigation helper */}
              <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-card border rounded-lg p-2 shadow-lg flex gap-2">
                  <Button
                    variant={currentPage === 'home' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setCurrentPage('home');
                      setSelectedProduct(null);
                    }}
                  >
                    Home
                  </Button>
                  <Button
                    variant={currentPage === 'products' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setCurrentPage('products');
                      setSelectedProduct(null);
                    }}
                  >
                    Products
                  </Button>
                </div>
              </div>
            </>
          )}

          {currentPage === 'products' && (
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                      All Products
                    </h2>
                    <p className="text-muted-foreground">
                      Browse our complete collection
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => {
                    setCurrentPage('home');
                    setSelectedProduct(null);
                  }}>
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
                  <div 
                    className="cursor-pointer"
                    onClick={(e) => {
                      // Allow clicking on product cards to view details
                      const target = (e.target as HTMLElement).closest('[data-product-id]');
                      if (target) {
                        const productId = target.getAttribute('data-product-id');
                        // Find product by matching the mapped id (which is based on sku)
                        const product = demoContent.products.find((p: any) => {
                          const mappedId = p.sku.toLowerCase().replace(/\s+/g, '-');
                          return mappedId === productId || p.sku === productId;
                        });
                        if (product) {
                          setSelectedProduct(product);
                          setCurrentPage('product-detail');
                        }
                      }
                    }}
                  >
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
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {currentPage === 'product-detail' && selectedProduct && (
            <section className="py-16">
              <div className="container mx-auto px-4 max-w-6xl">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCurrentPage('products');
                    setSelectedProduct(null);
                  }}
                  className="mb-6"
                >
                  ← Back to Products
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="relative">
                    {selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        className="w-full h-auto rounded-lg"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.image-fallback')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'image-fallback w-full aspect-square flex items-center justify-center bg-muted rounded-lg';
                            fallback.innerHTML = '<span class="text-6xl">📦</span>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-muted rounded-lg">
                        <span className="text-6xl">📦</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                      {selectedProduct.name}
                    </h1>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-3xl font-bold">${selectedProduct.price.toFixed(2)}</span>
                      {selectedProduct.compareAtPrice && (
                        <span className="text-xl text-muted-foreground line-through">
                          ${selectedProduct.compareAtPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-6">{selectedProduct.description}</p>
                    <div className="space-y-4 mb-6">
                      {selectedProduct.metadata && Object.entries(selectedProduct.metadata).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-semibold capitalize">{key}:</span>
                          <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4">
                      <Button size="lg" className="flex-1">
                        Add to Cart
                      </Button>
                      <Button size="lg" variant="outline">
                        Wishlist
                      </Button>
                    </div>
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Stock:</strong> {selectedProduct.stock_quantity} available
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>SKU:</strong> {selectedProduct.sku}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentPage === 'about' && (
            <section className="py-16">
              <div className="container mx-auto px-4 max-w-4xl">
                <h1 className="text-4xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                  About Us
                </h1>
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-muted-foreground mb-6">
                    Welcome to our store! We are committed to providing you with the best products and exceptional customer service.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
                        <p className="text-muted-foreground">
                          To deliver high-quality products that enhance your daily life while maintaining the highest standards of customer satisfaction.
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold mb-3">Our Values</h3>
                        <p className="text-muted-foreground">
                          Integrity, quality, and customer-first approach guide everything we do. We believe in building lasting relationships with our customers.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentPage === 'contact' && (
            <section className="py-16">
              <div className="container mx-auto px-4 max-w-4xl">
                <h1 className="text-4xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                  Contact Us
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Get in Touch</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold mb-1">Email</p>
                          <p className="text-muted-foreground">support@storeflow.com</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Phone</p>
                          <p className="text-muted-foreground">+1 (555) 123-4567</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Address</p>
                          <p className="text-muted-foreground">
                            123 Commerce Street<br />
                            Business City, BC 12345
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Business Hours</h3>
                      <div className="space-y-2 text-muted-foreground">
                        <p><strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM</p>
                        <p><strong>Saturday:</strong> 10:00 AM - 4:00 PM</p>
                        <p><strong>Sunday:</strong> Closed</p>
                      </div>
                      <div className="mt-6">
                        <Button className="w-full">Send Message</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          )}

          {currentPage === 'sign-in' && (
            <section className="py-16">
              <div className="container mx-auto px-4 max-w-md">
                <Card>
                  <CardContent className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                      Sign In
                    </h1>
                    <p className="text-muted-foreground text-center mb-6">
                      Sign in to your account to continue
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email</label>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Password</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" disabled />
                          Remember me
                        </label>
                        <button className="text-sm text-primary hover:underline" disabled>
                          Forgot password?
                        </button>
                      </div>
                      <Button className="w-full" disabled>
                        Sign In
                      </Button>
                      <div className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <button className="text-primary hover:underline" disabled>
                          Sign up
                        </button>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground text-center">
                        This is a preview. Sign in functionality is not available in preview mode.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}
        </main>

          <ThemeFooter />
        </div>
      </PreviewProvider>
    </div>
  );
}

