/**
 * Products Listing Client Component
 * 
 * Client-side product listing with search, filters, and pagination
 * 
 * Day 30: Tenant Storefront - Product Listing
 */

'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '@/lib/currency/currency-context';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  image: string | null;
  stock_quantity: number | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
}

interface ProductsListingClientProps {
  initialProducts: Product[];
  initialTotal: number;
  initialCategories: Category[];
  initialPage: number;
  initialLimit: number;
  initialSearch: string;
  initialCategory: string;
  initialSortBy: string;
  initialSortOrder: string;
}

export default function ProductsListingClient({
  initialProducts,
  initialTotal,
  initialCategories,
  initialPage,
  initialLimit,
  initialSearch,
  initialCategory,
  initialSortBy,
  initialSortOrder,
}: Readonly<ProductsListingClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [isSearching, setIsSearching] = useState(false);

  const totalPages = Math.ceil(total / initialLimit);

  const updateFilters = useCallback(() => {
    startTransition(() => {
      setIsSearching(true);
      const params = new URLSearchParams(searchParams.toString());
      
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      } else {
        params.delete('search');
      }

      if (category) {
        params.set('category', category);
      } else {
        params.delete('category');
      }

      if (sortBy !== 'created_at') {
        params.set('sort', sortBy);
      } else {
        params.delete('sort');
      }

      if (sortOrder !== 'desc') {
        params.set('order', sortOrder);
      } else {
        params.delete('order');
      }

      params.set('page', '1'); // Reset to first page
      router.push(`/products?${params.toString()}`);
      
      // Fetch updated products from API
      fetch(`/api/products?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (data.products) {
            setProducts(data.products.map((p: any) => ({
              ...p,
              price: Number(p.price),
            })));
            setTotal(data.pagination?.total || 0);
          }
          setIsSearching(false);
        })
        .catch(err => {
          console.error('Error fetching products:', err);
          setIsSearching(false);
        });
    });
  }, [debouncedSearch, category, sortBy, sortOrder, searchParams, router]);

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Auto-search when debounced search changes (search-as-you-type)
  useEffect(() => {
    // Only trigger if search actually changed (not on initial mount)
    if (debouncedSearch !== initialSearch) {
      updateFilters();
    }
  }, [debouncedSearch, updateFilters, initialSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger search immediately on form submit
    setDebouncedSearch(search);
  };

  // Using formatCurrency from useCurrency hook

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Products</h1>
        <p className="text-muted-foreground">
          Browse our collection of {total} products
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" disabled={isPending}>
            Search
          </Button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={category || 'all'} onValueChange={(value) => setCategory(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {initialCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={updateFilters} disabled={isPending}>
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-0">
                    <div className="relative aspect-square bg-muted rounded-t-lg overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                      {product.stock_quantity === 0 && (
                        <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-medium">
                          Out of Stock
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-lg font-bold">{formatCurrency(product.price)}</p>
                       {product.stock_quantity !== null && product.stock_quantity > 0 && (
                         <p className="text-sm text-muted-foreground mt-1">
                           {product.stock_quantity} in stock
                         </p>
                       )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={initialPage === 1 || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(initialPage - 1));
                  router.push(`/products?${params.toString()}`);
                }}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (initialPage <= 3) {
                    pageNum = i + 1;
                  } else if (initialPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = initialPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={initialPage === pageNum ? 'default' : 'outline'}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', String(pageNum));
                        router.push(`/products?${params.toString()}`);
                      }}
                      disabled={isPending}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                disabled={initialPage === totalPages || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(initialPage + 1));
                  router.push(`/products?${params.toString()}`);
                }}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

