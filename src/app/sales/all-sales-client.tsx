/**
 * All Sales Client Component
 * 
 * Displays grid of all active sales
 * 
 * Phase 4: Storefront - Sales Implementation
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CountdownTimer from '@/components/storefront/countdown-timer';

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">All Sales</h1>
        <p className="text-lg text-muted-foreground">
          Browse our current sales and special offers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sales.map((sale) => (
          <Link key={sale.id} href={`/sales/${sale.slug}`}>
            <Card className="group overflow-hidden hover:shadow-lg transition-shadow h-full">
              <div className="relative aspect-video overflow-hidden">
                {sale.banner_image ? (
                  <Image
                    src={sale.banner_image}
                    alt={sale.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-4xl">🏷️</span>
                  </div>
                )}
                {sale.is_featured && (
                  <Badge className="absolute top-2 right-2">Featured</Badge>
                )}
                {sale.badge_text && (
                  <Badge
                    className="absolute top-2 left-2"
                    style={{
                      backgroundColor: sale.badge_color || '#EF4444',
                      color: '#FFFFFF',
                    }}
                  >
                    {sale.badge_text}
                  </Badge>
                )}
              </div>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {sale.name}
                </h2>
                {sale.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {sale.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{sale._count.product_sales} products</span>
                  {sale.end_date && (
                    <CountdownTimer
                      endDate={sale.end_date}
                      showLabels={false}
                      className="text-xs"
                    />
                  )}
                </div>
                {sale.end_date && (
                  <div className="mt-4">
                    <CountdownTimer endDate={sale.end_date} />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
