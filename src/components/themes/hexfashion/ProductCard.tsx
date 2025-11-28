/**
 * HexFashion Theme Product Card
 * 
 * Fashion-focused product card with catalog styling
 * Day 37: Theme Templates
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  stock_quantity: number | null;
  metadata?: Record<string, unknown>;
}

interface HexFashionProductCardProps {
  product: Product;
  className?: string;
}

export default function HexFashionProductCard({ product, className }: HexFashionProductCardProps) {
  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;

  return (
    <Card className={`group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 ${className}`}>
      <Link href={`/products/${product.slug || product.id}`}>
        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">👕</span>
            </div>
          )}
          {isOnSale && (
            <Badge className="absolute top-4 left-4 rounded-none" variant="destructive">
              Sale
            </Badge>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
              <Badge variant="secondary" className="rounded-none">Out of Stock</Badge>
            </div>
          )}
          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-none"
              onClick={(e) => {
                e.preventDefault();
                // Add to wishlist
              }}
            >
              <HeartIcon className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-none"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                // Add to cart
              }}
            >
              <ShoppingBagIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Link>
      
      <CardContent className="p-4 space-y-2">
        <Link href={`/products/${product.slug || product.id}`}>
          <h3 className="font-light text-lg hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {/* Sizes preview */}
        {(product.metadata as any)?.sizes && (
          <div className="text-xs text-muted-foreground">
            Sizes: {Array.isArray((product.metadata as any).sizes) ? (product.metadata as any).sizes.join(', ') : String((product.metadata as any).sizes)}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-light">${product.price.toFixed(2)}</span>
            {isOnSale && product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through font-light">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

