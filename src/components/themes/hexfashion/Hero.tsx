/**
 * HexFashion Theme Hero Section
 * 
 * Fashion-focused hero with elegant styling
 * Day 37: Theme Templates
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface HexFashionHeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
}

export default function HexFashionHero({
  title = 'Timeless Fashion, Modern Style',
  subtitle = 'Discover our curated collection of elegant pieces designed for the modern wardrobe',
  ctaText = 'Shop Collection',
  ctaLink = '/products',
  image,
}: HexFashionHeroProps) {
  return (
    <section className="relative bg-background py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-wide leading-tight">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 font-light">
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="lg" variant="default" className="rounded-none">
                <Link href={ctaLink}>{ctaText}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-none">
                <Link href="/products">Browse All</Link>
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            {image ? (
              <img
                src={image}
                alt={title}
                className="w-full h-auto object-cover"
              />
            ) : (
              <div className="aspect-[4/5] bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
                <div className="text-6xl">👗</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

