/**
 * Default Theme Homepage
 * 
 * Most appealing theme with hero, testimonials, products, and blogs
 * Computer/electronics focused with beautiful design
 */

'use client';

import { memo, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Laptop, Smartphone, Headphones, MousePointer2 } from 'lucide-react';
import type { DemoProduct } from '@/lib/themes/demo-content';
import DefaultProductGrid from './ProductGrid';
import DefaultHero from './Hero';
import DefaultTestimonials from './Testimonials';
import DefaultBlogs from './Blogs';
import { usePreview } from '@/lib/themes/preview-context';

interface DefaultHomepageProps {
  products?: DemoProduct[];
  categories?: Array<{ name: string; slug: string; description: string }>;
}

function DefaultHomepage({ products = [], categories = [] }: DefaultHomepageProps) {
  const { onProductClick: onProductClickPreview, onNavigate } = usePreview();
  
  // Memoize product mapping to prevent unnecessary re-renders
  const featuredProducts = useMemo(() => {
    return products.slice(0, 8).map((p: any) => ({
      id: p.sku,
      name: p.name,
      slug: p.sku.toLowerCase().replace(/\s+/g, '-'),
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      image: p.image,
      stock_quantity: p.stock_quantity,
      metadata: p.metadata,
    }));
  }, [products]);

  // Wrap onProductClick to convert Product to productId
  const handleProductClick = useCallback((product: { id: string; name: string; slug: string | null; price: number; compareAtPrice?: number; image: string | null; stock_quantity: number | null; metadata?: Record<string, unknown> }) => {
    if (onProductClickPreview) {
      onProductClickPreview(product.id);
    }
  }, [onProductClickPreview]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <DefaultHero
        title="Premium Computers & Electronics"
        subtitle="Discover the latest technology and computing solutions for your home and office. From powerful workstations to cutting-edge accessories."
        ctaText="Shop Now"
        ctaLink="/products"
        image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=800&fit=crop"
      />

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-heading, inherit)' }}
              >
                Shop by Category
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Explore our wide range of computer and electronics categories
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map((category: any) => {
                // Get appropriate icon and image for each category
                const getCategoryIcon = (categoryName: string) => {
                  const name = categoryName.toLowerCase();
                  if (name.includes('laptop') || name.includes('computer')) {
                    return <Laptop className="h-10 w-10 text-primary" />;
                  } else if (name.includes('phone') || name.includes('mobile')) {
                    return <Smartphone className="h-10 w-10 text-primary" />;
                  } else if (name.includes('audio') || name.includes('headphone') || name.includes('speaker')) {
                    return <Headphones className="h-10 w-10 text-primary" />;
                  } else {
                    return <MousePointer2 className="h-10 w-10 text-primary" />;
                  }
                };

                const getCategoryImage = (categoryName: string) => {
                  const name = categoryName.toLowerCase();
                  if (name.includes('laptop') || name.includes('computer')) {
                    return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop';
                  } else if (name.includes('phone') || name.includes('mobile')) {
                    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop';
                  } else if (name.includes('audio') || name.includes('headphone') || name.includes('speaker')) {
                    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';
                  } else {
                    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop';
                  }
                };

                return (
                  <div key={category.slug}>
                    {onNavigate ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(`/products?category=${category.slug}`);
                        }}
                        className="w-full text-left"
                      >
                        <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full border-2 hover:border-primary/50">
                          <div className="relative aspect-square overflow-hidden rounded-t-lg">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 right-4">
                              <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center mb-2">
                                {getCategoryIcon(category.name)}
                              </div>
                            </div>
                          </div>
                          <CardContent className="p-6">
                            <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                              {category.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {category.description}
                            </p>
                          </CardContent>
                        </Card>
                      </button>
                    ) : (
                      <a href={`/products?category=${category.slug}`} className="block">
                        <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full border-2 hover:border-primary/50">
                          <div className="relative aspect-square overflow-hidden rounded-t-lg">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 right-4">
                              <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center mb-2">
                                {getCategoryIcon(category.name)}
                              </div>
                            </div>
                          </div>
                          <CardContent className="p-6">
                            <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                              {category.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {category.description}
                            </p>
                          </CardContent>
                        </Card>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-heading, inherit)' }}
              >
                Featured Products
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Handpicked selection of premium computers and electronics
              </p>
            </div>
            <DefaultProductGrid
              products={featuredProducts}
              columns={4}
              onProductClick={handleProductClick}
            />
            <div className="text-center mt-12">
              {onNavigate ? (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/products');
                  }}
                >
                  View All Products <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" size="lg" asChild>
                  <Link href="/products">
                    View All Products <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <DefaultTestimonials />

      {/* Blogs Section */}
      <DefaultBlogs />
    </div>
  );
}

export default memo(DefaultHomepage);

