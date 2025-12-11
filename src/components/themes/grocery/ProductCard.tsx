/**
 * Grocery Theme Product Card
 * 
 * Grocery-focused product card with organic badges
 */

'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { usePreview } from '@/lib/themes/preview-context';

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

interface GroceryProductCardProps {
  product: Product;
  className?: string;
}

export default function GroceryProductCard({ product, className }: GroceryProductCardProps) {
  const { isPreview, onProductClick } = usePreview();
  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;
  const discountPercent = isOnSale && product.compareAtPrice 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview && onProductClick) {
      e.preventDefault();
      onProductClick(product.id);
    }
  };

  return (
    <Card className={`group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-green-200 ${className}`}>
      <div className="relative">
        {isPreview ? (
          <div
            onClick={handleClick}
            className="w-full cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as any);
              }
            }}
          >
            <div className="relative aspect-square bg-green-50 overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-green-50">
                  <span className="text-5xl">🥬</span>
                </div>
              )}
              {isOnSale && (
                <Badge className="absolute top-3 left-3 z-10 bg-green-600 text-white font-bold px-3 py-1">
                  {discountPercent}% OFF
                </Badge>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Badge variant="secondary" className="text-lg px-4 py-2">Out of Stock</Badge>
                </div>
              )}
              {/* Organic badge overlay */}
              <div className="absolute top-3 right-3 z-10">
                <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">
                  Organic
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <Link href={`/products/${product.slug || product.id}`}>
            <div className="relative aspect-square bg-green-50 overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-green-50">
                  <span className="text-5xl">🥬</span>
                </div>
              )}
              {isOnSale && (
                <Badge className="absolute top-3 left-3 z-10 bg-green-600 text-white font-bold px-3 py-1">
                  {discountPercent}% OFF
                </Badge>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Badge variant="secondary" className="text-lg px-4 py-2">Out of Stock</Badge>
                </div>
              )}
              {/* Organic badge overlay */}
              <div className="absolute top-3 right-3 z-10">
                <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">
                  Organic
                </Badge>
              </div>
            </div>
          </Link>
        )}
      </div>
      
      <CardContent className="p-4 bg-white">
        {isPreview ? (
          <h3 
            className="font-semibold mb-2 hover:text-green-600 transition-colors line-clamp-2 cursor-pointer text-gray-900" 
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as any);
              }
            }}
          >
            {product.name}
          </h3>
        ) : (
          <Link href={`/products/${product.slug || product.id}`}>
            <h3 className="font-semibold mb-2 hover:text-green-600 transition-colors line-clamp-2 text-gray-900">
              {product.name}
            </h3>
          </Link>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-green-600">${product.price.toFixed(2)}</span>
            {isOnSale && product.compareAtPrice && (
              <span className="text-sm text-gray-500 line-through">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
