/**
 * All Sales Client Component
 * 
 * Displays grid of all active sales with modern e-commerce design
 * 
 * Phase 4: Storefront - Sales Implementation
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CountdownTimer from '@/components/storefront/countdown-timer';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface Sale {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_image: string | null;
  badge_text: string | null;
  badge_color: string | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  is_featured: boolean;
  _count: {
    product_sales: number;
  };
}

interface AllSalesClientProps {
  sales: Sale[];
}

export default function AllSalesClient({ sales }: Readonly<AllSalesClientProps>) {
  if (sales.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Sales</h1>
          <p className="text-muted-foreground">No active sales at the moment. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">All Sales</h1>
        <p className="text-base md:text-lg text-muted-foreground">
          Browse our current sales and special offers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {sales.map((sale) => (
          <Card 
            key={sale.id} 
            className="group overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col border-2 hover:border-primary/20"
          >
            {/* Image Section with Overlay */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
              {sale.banner_image ? (
                <Image
                  src={sale.banner_image}
                  alt={sale.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  priority={sale.is_featured}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <span className="text-6xl opacity-50">🏷️</span>
                </div>
              )}
              
              {/* Gradient Overlay - pointer-events-none so it never blocks clicks on card/content below */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" aria-hidden="true" />
              
              {/* Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
                {sale.badge_text && (
                  <Badge
                    className="px-3 py-1.5 text-xs font-semibold shadow-lg"
                    style={{
                      backgroundColor: sale.badge_color || '#EF4444',
                      color: '#FFFFFF',
                    }}
                  >
                    {sale.badge_text}
                  </Badge>
                )}
                {sale.is_featured && (
                  <Badge className="px-3 py-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white shadow-lg">
                    Featured
                  </Badge>
                )}
              </div>

              {/* Product Count Badge */}
              <div className="absolute bottom-3 left-3 z-10">
                <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-white/90 backdrop-blur-sm">
                  {sale._count.product_sales} {sale._count.product_sales === 1 ? 'product' : 'products'}
                </Badge>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-1">
              {/* Title - Clickable */}
              <Link 
                href={`/sales/${sale.slug}`}
                className="block mb-3 group/title"
              >
                <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover/title:text-primary transition-colors line-clamp-2">
                  {sale.name}
                </h2>
              </Link>
              
              {/* Description */}
              {sale.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                  {sale.description}
                </p>
              )}

              {/* Countdown Timer */}
              {sale.end_date && (
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Ends in:
                    </span>
                  </div>
                  <CountdownTimer 
                    endDate={sale.end_date} 
                    className="text-sm"
                  />
                </div>
              )}

              {/* CTA Button - native Link navigation so Next.js handles client-side transition and page load */}
              {sale.slug ? (
                <div className="mt-auto space-y-2">
                  <Button
                    asChild
                    className="w-full"
                    size="lg"
                  >
                    <Link
                      href={`/sales/${sale.slug}`}
                      className="inline-flex items-center justify-center gap-2 group/btn"
                      scroll={true}
                    >
                      Shop Now
                      <ArrowRightIcon className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <p className="text-center">
                    <Link
                      href={`/sales/${sale.slug}`}
                      className="text-sm text-primary underline hover:no-underline"
                      scroll={true}
                    >
                      Open sale page →
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="mt-auto">
                  <Button 
                    className="w-full"
                    size="lg"
                    disabled
                    variant="outline"
                  >
                    Shop Now
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Sale slug missing
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
