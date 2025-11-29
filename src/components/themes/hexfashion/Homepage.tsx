/**
 * HexFashion Theme Homepage
 * 
 * Fashion-focused homepage with elegant sections
 * Day 37: Theme Templates with Demo Content
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Heart, ShoppingBag, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { DemoProduct } from '@/lib/themes/demo-content';
import HexFashionHero from './Hero';
import HexFashionProductGrid from './ProductGrid';
import { usePreview } from '@/lib/themes/preview-context';

interface HexFashionHomepageProps {
  products?: DemoProduct[];
  categories?: Array<{ name: string; slug: string; description: string }>;
}

export default function HexFashionHomepage({ products = [], categories = [] }: HexFashionHomepageProps) {
  const { onProductClick } = usePreview();
  const featuredProducts = products.slice(0, 8);
  const newCollection = products.slice(0, 6);
  const bestSellers = products.slice(6, 12);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HexFashionHero
        title="Timeless Fashion, Modern Style"
        subtitle="Discover our curated collection of elegant pieces designed for the modern wardrobe"
        ctaText="Shop Collection"
        ctaLink="#products"
      />

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {categories.map((category: any) => (
                <Link key={category.slug} href={`#category-${category.slug}`}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-transparent">
                    <CardContent className="p-4 text-center">
                      <div className="aspect-square w-full mb-3 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{category.name}</h3>
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
                  Featured Collection
                </h2>
                <p className="text-muted-foreground">Curated pieces for your style</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="#all-products">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <HexFashionProductGrid
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
            />
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Curated Selection</h3>
              <p className="text-muted-foreground">Handpicked pieces for your wardrobe</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Quality</h3>
              <p className="text-muted-foreground">Only the finest materials and craftsmanship</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Style Guide</h3>
              <p className="text-muted-foreground">Expert styling tips with every purchase</p>
            </div>
          </div>
        </div>
      </section>

      {/* New Collection Section */}
      {newCollection.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
              New Collection
            </h2>
            <HexFashionProductGrid
              products={newCollection.map((p: any) => ({
                id: p.sku,
                name: p.name,
                slug: p.sku.toLowerCase().replace(/\s+/g, '-'),
                price: p.price,
                compareAtPrice: p.compareAtPrice,
                image: p.image,
                stock_quantity: p.stock_quantity,
                metadata: p.metadata,
              }))}
              columns={3}
            />
          </div>
        </section>
      )}
    </div>
  );
}

