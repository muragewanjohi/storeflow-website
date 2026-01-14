/**
 * Products Listing Client Component - Simplified
 * 
 * Just displays products in a grid - no filters, no complex logic
 */

'use client';

import { useMemo } from 'react';
import { loadThemeProductCard } from '@/lib/themes/theme-loader';
import DefaultProductCard from '@/components/themes/default/ProductCard';

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

interface ProductsListingClientProps {
  initialProducts: Product[];
  initialTotal: number;
  initialCategories: any[];
  initialPage: number;
  initialLimit: number;
  initialSearch: string;
  initialCategory: string;
  initialSortBy: string;
  initialSortOrder: string;
  currentCategory?: any;
  themeSlug?: string;
}

export default function ProductsListingClient({
  initialProducts = [],
  initialTotal = 0,
  themeSlug = 'default',
}: Readonly<ProductsListingClientProps>) {
  // Load theme-specific product card
  const ThemeProductCard = useMemo(() => {
    const CardComponent = loadThemeProductCard(themeSlug);
    return CardComponent || DefaultProductCard;
  }, [themeSlug]);

  // Ensure products is always an array
  const products = Array.isArray(initialProducts) ? initialProducts : [];

  console.log('[ProductsListingClient] Rendering', {
    productsCount: products.length,
    total: initialTotal,
  });

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No products found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Products</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product: any) => {
          try {
            return (
              <ThemeProductCard
                key={product.id}
                product={product}
              />
            );
          } catch (error) {
            console.error('[ProductsListingClient] Error rendering product:', product?.id, error);
            return (
              <div key={product.id} className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Error loading product</p>
                <p className="text-xs text-muted-foreground mt-1">{product?.name || product?.id}</p>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
