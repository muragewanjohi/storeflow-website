/**
 * HexFashion Theme Product Grid
 * 
 * Fashion-focused catalog-style product grid
 * Day 37: Theme Templates
 */

'use client';

import HexFashionProductCard from './ProductCard';

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

interface HexFashionProductGridProps {
  products: Product[];
  columns?: number;
  className?: string;
}

export default function HexFashionProductGrid({
  products,
  columns = 4,
  className,
}: HexFashionProductGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} gap-8 ${className}`}>
      {products.map((product: any) => (
        <div key={product.id} data-product-id={product.id}>
          <HexFashionProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

