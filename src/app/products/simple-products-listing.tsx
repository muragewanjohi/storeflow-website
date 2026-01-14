/**
 * Simplified Products Listing - Optimized for Performance
 * 
 * Removes complex state management and useEffect loops
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  stock_quantity: number | null;
  category_id: string | null;
}

interface SimpleProductsListingProps {
  products: Product[];
  total: number;
}

export default function SimpleProductsListing({ 
  products,
  total 
}: SimpleProductsListingProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-gray-600">Showing {products.length} of {total} products</p>
      </div>

      {/* Products Grid */}
      <div className={`grid gap-6 ${
        view === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug || product.id}`}
            className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200"
          >
            {/* Product Image */}
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              
              {/* Sale Badge */}
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                  Sale
                </div>
              )}
              
              {/* Stock Badge */}
              {product.stock_quantity !== null && product.stock_quantity <= 0 && (
                <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded text-sm font-semibold">
                  Out of Stock
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              
              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  ${product.price.toFixed(2)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </div>
              
              {/* Stock Info */}
              {product.stock_quantity !== null && (
                <p className="text-sm text-gray-600 mt-2">
                  {product.stock_quantity > 0 
                    ? `${product.stock_quantity} in stock` 
                    : 'Out of stock'
                  }
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No products found</p>
        </div>
      )}
    </div>
  );
}
