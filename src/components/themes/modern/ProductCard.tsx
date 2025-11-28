/**
 * Modern Theme Product Card
 * 
 * Electronics-focused product card with tech styling
 * Day 37: Theme Templates
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

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

interface ModernProductCardProps {
  product: Product;
  className?: string;
}

export default function ModernProductCard({ product, className }: ModernProductCardProps) {
  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;

  return (
    <Card className={`group overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <Link href={`/products/${product.slug || product.id}`}>
        <div className="relative aspect-square bg-muted overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">📱</span>
            </div>
          )}
          {isOnSale && (
            <Badge className="absolute top-2 left-2" variant="destructive">
              Sale
            </Badge>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/products/${product.slug || product.id}`}>
          <h3 className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        
        {/* Tech specs preview */}
        {product.metadata && (
          <div className="text-xs text-muted-foreground mb-2 space-y-1">
            {(product.metadata as any).brand && (
              <div>Brand: {String((product.metadata as any).brand)}</div>
            )}
            {(product.metadata as any).model && (
              <div>Model: {String((product.metadata as any).model)}</div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
            {isOnSale && product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          <Button
            size="sm"
            variant="outline"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.preventDefault();
              // Add to cart logic here
            }}
          >
            <ShoppingCartIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

