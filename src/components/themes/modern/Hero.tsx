/**
 * Modern Theme Hero Section
 * 
 * Electronics-focused hero with tech imagery
 * Day 37: Theme Templates
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface ModernHeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
}

export default function ModernHero({
  title = 'Latest Technology at Your Fingertips',
  subtitle = 'Discover cutting-edge electronics and gadgets for your digital lifestyle',
  ctaText = 'Shop Now',
  ctaLink = '/products',
  image,
}: ModernHeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg">
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="group">
                <Link href={ctaLink}>
                  {ctaText}
                  <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/products">Browse All</Link>
              </Button>
            </div>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div>
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Tech Support</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Free</div>
                <div className="text-sm text-muted-foreground">Shipping</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">2-Year</div>
                <div className="text-sm text-muted-foreground">Warranty</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            {image ? (
              <img
                src={image}
                alt={title}
                className="rounded-lg shadow-2xl w-full h-auto"
              />
            ) : (
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                <div className="text-6xl">💻</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

