/**
 * Default Homepage Client Component
 * 
 * Default homepage when no custom page builder content exists
 * 
 * Day 30: Tenant Storefront - Homepage
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DefaultProductCard from '@/components/themes/default/ProductCard';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  sale_price?: number | null;
  compareAtPrice?: number;
  image: string | null;
  stock_quantity: number | null;
  averageRating?: number;
  totalReviews?: number;
}

interface HomepageClientProps {
  featuredProducts: Product[];
  tenantName: string;
}

export default function HomepageClient({
  featuredProducts,
  tenantName,
}: Readonly<HomepageClientProps>) {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left space-y-6">
              {/* Tagline */}
              <div className="flex items-center gap-2 justify-center md:justify-start text-sm md:text-base text-muted-foreground">
                <span>Our Platform, Your Success</span>
                <span className="text-lg">🎯</span>
              </div>
              
              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Build your Online Shop site within{' '}
                <span className="text-primary">minutes</span>
              </h1>
              
              {/* Description */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto md:mx-0">
                Manage products, payments, and sales effortlessly. Everything you need to grow your business is just a click away. Start today and simplify your e-commerce journey.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                <Button asChild size="lg" className="text-base px-8 py-6 group">
                  <Link href="/products">
                    Get Started Now
                    <svg className="ml-2 h-5 w-5 inline-block group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base px-8 py-6">
                  <Link href="/products">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Image */}
            <div className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=1200&fit=crop"
                alt="Person holding laptop"
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Featured Products</h2>
              <Button asChild variant="outline">
                <Link href="/products">View All</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product: any) => (
                <DefaultProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Shop?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Browse our full collection of products
          </p>
          <Button asChild size="lg">
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

