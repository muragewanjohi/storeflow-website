/**
 * Grocery Theme Product Grid
 * 
 * Product grid layout for grocery theme
 */

'use client';

import { memo } from 'react';
import GroceryProductCard from './ProductCard';

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

interface GroceryProductGridProps {
  products: Product[];
  columns?: number;
  className?: string;
  onProductClick?: (product: Product) => void;
}

function GroceryProductGrid({
  products,
  columns = 4,
  className,
  onProductClick,
}: GroceryProductGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} gap-6 ${className}`}>
      {products.map((product: any) => (
        <div key={product.id} data-product-id={product.id}>
          <GroceryProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

export default memo(GroceryProductGrid);
