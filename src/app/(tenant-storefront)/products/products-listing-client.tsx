/**
 * Products Listing Client Component
 * 
 * Fetches products from API with pagination support
 * Follows e-commerce best practices (Amazon, Shopify patterns)
 */

'use client';

import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { loadThemeProductCard } from '@/lib/themes/theme-loader';
import DefaultProductCard from '@/components/themes/default/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  initialProducts?: Product[];
  initialTotal?: number;
  initialCategories?: any[];
  initialPage?: number;
  initialLimit?: number;
  initialSearch?: string;
  initialCategory?: string;
  initialSortBy?: string;
  initialSortOrder?: string;
  currentCategory?: any;
  themeSlug?: string;
}

function ProductsListingClient({
  themeSlug = 'default',
}: Readonly<ProductsListingClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get pagination params from URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '24', 10);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load theme-specific product card - memoize to prevent re-creation
  const ThemeProductCard = useMemo(() => {
    const CardComponent = loadThemeProductCard(themeSlug);
    return CardComponent || DefaultProductCard;
  }, [themeSlug]);

  // Fetch products with pagination
  const fetchProducts = useCallback(async (page: number, limit: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters with pagination
      const params = new URLSearchParams();
      params.append('status', 'active');
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      // Preserve other filters from URL
      const search = searchParams.get('search');
      const category = searchParams.get('category');
      const sort = searchParams.get('sort');
      const order = searchParams.get('order');
      
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (sort) params.append('sort_by', sort);
      if (order) params.append('sort_order', order);
      
      // Fetch products from API with pagination
      const response = await fetch(`/api/products?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      
      // Convert products to match Product interface
      const fetchedProducts: Product[] = (data.products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: typeof p.price === 'number' ? p.price : Number(p.price),
        compareAtPrice: p.compareAtPrice ? (typeof p.compareAtPrice === 'number' ? p.compareAtPrice : Number(p.compareAtPrice)) : undefined,
        image: p.image,
        stock_quantity: p.stock_quantity,
      }));
      
      setProducts(fetchedProducts);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  // Fetch products when page or limit changes
  useEffect(() => {
    fetchProducts(currentPage, currentLimit);
  }, [currentPage, currentLimit, fetchProducts]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / currentLimit);
  const startItem = total > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const endItem = Math.min(currentPage * currentLimit, total);

  // Update URL with new page/limit while preserving other params
  const updateURL = useCallback((updates: { page?: number; limit?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (updates.page !== undefined) {
      if (updates.page === 1) {
        params.delete('page');
      } else {
        params.set('page', updates.page.toString());
      }
    }
    
    if (updates.limit !== undefined) {
      params.set('limit', updates.limit.toString());
      // Reset to page 1 when changing limit
      params.delete('page');
    }
    
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  // Generate page numbers with ellipsis (e-commerce pattern)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Show up to 7 page numbers
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Near the start: 1 2 3 4 5 ... last
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end: 1 ... (n-4) (n-3) (n-2) (n-1) n
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle: 1 ... (current-1) current (current+1) ... last
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Products</h1>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Products</h1>
        <div className="text-center py-12">
          <p className="text-lg text-red-600">Error: {error}</p>
          <Button 
            onClick={() => fetchProducts(currentPage, currentLimit)}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (products.length === 0 && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Products</h1>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No products found</p>
        </div>
      </div>
    );
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with results count and per-page selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Products</h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {startItem}-{endItem} of {total} products
            </p>
          )}
        </div>
        
        {/* Products per page selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="per-page" className="text-sm text-muted-foreground whitespace-nowrap">
            Show:
          </label>
          <Select
            value={currentLimit.toString()}
            onValueChange={(value) => updateURL({ limit: parseInt(value, 10) })}
          >
            <SelectTrigger id="per-page" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
              <SelectItem value="96">96</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading && products.length > 0 ? (
        <div className="relative">
          <div className="opacity-50 pointer-events-none">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product: any) => (
                <ThemeProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
          {/* Results count (mobile) */}
          <div className="text-sm text-muted-foreground sm:hidden">
            Page {currentPage} of {totalPages}
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateURL({ page: currentPage - 1 })}
              disabled={currentPage === 1 || isLoading}
              className="flex items-center gap-1"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Page Numbers - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              {pageNumbers.map((page, index) => {
                if (page === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                
                const pageNum = page as number;
                const isActive = pageNum === currentPage;
                
                return (
                  <Button
                    key={pageNum}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateURL({ page: pageNum })}
                    disabled={isLoading}
                    className={`min-w-[40px] ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            {/* Current page indicator - Mobile */}
            <div className="md:hidden px-3 py-2 text-sm font-medium">
              {currentPage} / {totalPages}
            </div>

            {/* Next Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateURL({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages || isLoading}
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* Results count (desktop) */}
          <div className="hidden sm:block text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(ProductsListingClient);
