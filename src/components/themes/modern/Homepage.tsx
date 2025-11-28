/**
 * Modern Theme Homepage
 * 
 * Electronics-focused homepage with tech sections
 * Day 37: Theme Templates with Demo Content
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, TrendingUp, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import type { DemoProduct } from '@/lib/themes/demo-content';
import ModernHero from './Hero';
import ModernProductGrid from './ProductGrid';
import { usePreview } from '@/lib/themes/preview-context';

interface ModernHomepageProps {
  products?: DemoProduct[];
  categories?: Array<{ name: string; slug: string; description: string }>;
}

export default function ModernHomepage({ products = [], categories = [] }: ModernHomepageProps) {
  const { onProductClick } = usePreview();
  const featuredProducts = products.slice(0, 8);
  const newArrivals = products.slice(0, 4);
  const bestSellers = products.slice(4, 8);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <ModernHero
        title="Latest Technology at Your Fingertips"
        subtitle="Discover cutting-edge electronics and gadgets for your digital lifestyle"
        ctaText="Shop Now"
        ctaLink="#products"
      />

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map((category: any) => (
                <Link key={category.slug} href={`#category-${category.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section id="products" className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                  Featured Products
                </h2>
                <p className="text-muted-foreground">Handpicked tech essentials for you</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="#all-products">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ModernProductGrid
              products={featuredProducts.map((p: any) => ({
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
              onProductClick={onProductClick}
            />
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Latest Technology</h3>
              <p className="text-muted-foreground">Stay ahead with cutting-edge products</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Quality</h3>
              <p className="text-muted-foreground">Only the best brands and products</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast Shipping</h3>
              <p className="text-muted-foreground">Quick delivery to your doorstep</p>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      {newArrivals.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
              New Arrivals
            </h2>
            <ModernProductGrid
              products={newArrivals.map((p: any) => ({
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
              onProductClick={onProductClick}
            />
          </div>
        </section>
      )}
    </div>
  );
}

