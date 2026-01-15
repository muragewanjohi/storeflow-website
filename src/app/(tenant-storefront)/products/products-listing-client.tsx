/**
 * Products Listing Client Component
 * 
 * Fetches products from API with pagination support
 * Follows e-commerce best practices (Amazon, Shopify patterns)
 */

'use client';

import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { loadThemeProductCard } from '@/lib/themes/theme-loader';
import DefaultProductCard from '@/components/themes/default/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  stock_quantity: number | null;
  category_id: string | null;
  averageRating?: number;
  totalReviews?: number;
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
  
  // Get pagination and sort params from URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '24', 10);
  const currentSort = searchParams.get('sort') || 'popular'; // Default to 'popular'
  
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter sidebar state
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string | null }>>([]);
  const [attributes, setAttributes] = useState<Array<{ 
    id: string; 
    name: string; 
    type: string | null; 
    attribute_values: Array<{ id: string; value: string; color_code: string | null }> 
  }>>([]);
  const [showFilters, setShowFilters] = useState(false); // Mobile: start collapsed
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    attributes: true,
  });
  
  // Selected filters state - derived from URL on mount, updated when checkboxes change
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, Set<string>>>({});

  // Load theme-specific product card - memoize to prevent re-creation
  const ThemeProductCard = useMemo(() => {
    const CardComponent = loadThemeProductCard(themeSlug);
    return CardComponent || DefaultProductCard;
  }, [themeSlug]);

  // Fetch products with pagination, sorting, and filters
  const fetchProducts = useCallback(async (page: number, limit: number, sort: string, categoryIds?: string[], attributeFilters?: Record<string, string[]>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters with pagination
      const params = new URLSearchParams();
      params.append('status', 'active');
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      // Set sort parameters based on sort option (same as ProductTabsSectionComponent)
      if (sort === 'new') {
        params.append('sort_by', 'created_at');
        params.append('sort_order', 'desc');
      } else if (sort === 'low_price') {
        params.append('sort_by', 'price');
        params.append('sort_order', 'asc');
      } else if (sort === 'popular') {
        // For popular, sort by created_at desc as a proxy (in real app, would use views/sales)
        params.append('sort_by', 'created_at');
        params.append('sort_order', 'desc');
      }
      
      // Add category filters
      if (categoryIds && categoryIds.length > 0) {
        params.append('category', categoryIds.join(','));
      }
      
      // Add attribute filters (format: attr_{attributeId}=valueId1,valueId2)
      if (attributeFilters) {
        for (const [attributeId, valueIds] of Object.entries(attributeFilters)) {
          if (valueIds.length > 0) {
            params.append(`attr_${attributeId}`, valueIds.join(','));
          }
        }
      }
      
      // Preserve search from URL
      const search = searchParams.get('search');
      if (search) params.append('search', search);
      
      // Fetch products from API with pagination and filters
      const apiUrl = `/api/products?${params.toString()}`;
      console.log('[Products Client] Fetching products:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Products Client] API error:', response.status, errorText);
        throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[Products Client] Products fetched:', {
        count: data.products?.length || 0,
        total: data.pagination?.total || 0,
        filters: { categoryIds, attributeFilters },
      });
      
      // Convert products to match Product interface
      const fetchedProducts: Product[] = (data.products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: typeof p.price === 'number' ? p.price : Number(p.price),
        compareAtPrice: p.compareAtPrice ? (typeof p.compareAtPrice === 'number' ? p.compareAtPrice : Number(p.compareAtPrice)) : undefined,
        image: p.image,
        stock_quantity: p.stock_quantity,
        averageRating: p.averageRating !== undefined ? (typeof p.averageRating === 'number' ? p.averageRating : Number(p.averageRating)) : undefined,
        totalReviews: p.totalReviews !== undefined ? (typeof p.totalReviews === 'number' ? p.totalReviews : Number(p.totalReviews)) : undefined,
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

  // Initialize filters from URL on mount
  useEffect(() => {
    // Read category filters from URL
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const categoryIds = categoryParam.split(',').map(id => id.trim()).filter(Boolean);
      setSelectedCategories(new Set(categoryIds));
    }
    
    // Read attribute filters from URL
    const attrFilters: Record<string, Set<string>> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('attr_')) {
        const attributeId = key.replace('attr_', '');
        const valueIds = value.split(',').map(id => id.trim()).filter(Boolean);
        if (valueIds.length > 0) {
          attrFilters[attributeId] = new Set(valueIds);
        }
      }
    }
    setSelectedAttributes(attrFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - searchParams is intentionally excluded

  // Fetch products when page, limit, sort, or filters change
  useEffect(() => {
    // Convert selected filters to arrays for API
    const categoryIds = Array.from(selectedCategories);
    const attributeFilters: Record<string, string[]> = {};
    for (const [attributeId, valueIds] of Object.entries(selectedAttributes)) {
      attributeFilters[attributeId] = Array.from(valueIds);
    }
    
    fetchProducts(currentPage, currentLimit, currentSort, categoryIds, attributeFilters);
  }, [currentPage, currentLimit, currentSort, selectedCategories, selectedAttributes, fetchProducts]);

  // Fetch categories and attributes on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('/api/categories?status=active&include_children=false');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        }

        // Fetch attributes
        const attributesResponse = await fetch('/api/attributes');
        if (attributesResponse.ok) {
          const attributesData = await attributesResponse.json();
          setAttributes(attributesData.attributes || []);
        }
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, []);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / currentLimit);
  const startItem = total > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const endItem = Math.min(currentPage * currentLimit, total);

  // Update URL with new page/limit/sort while preserving other params
  const updateURL = useCallback((updates: { page?: number; limit?: number; sort?: string }) => {
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
    
    if (updates.sort !== undefined) {
      if (updates.sort === 'popular') {
        params.delete('sort'); // 'popular' is default
      } else {
        params.set('sort', updates.sort);
      }
      // Reset to page 1 when changing sort
      params.delete('page');
    }
    
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  // Update URL with filter changes
  const updateFilters = useCallback((categoryIds: string[], attributeFilters: Record<string, string[]>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update category filter
    if (categoryIds.length > 0) {
      params.set('category', categoryIds.join(','));
    } else {
      params.delete('category');
    }
    
    // Remove all existing attribute filters
    for (const key of params.keys()) {
      if (key.startsWith('attr_')) {
        params.delete(key);
      }
    }
    
    // Add new attribute filters
    for (const [attributeId, valueIds] of Object.entries(attributeFilters)) {
      if (valueIds.length > 0) {
        params.append(`attr_${attributeId}`, valueIds.join(','));
      }
    }
    
    // Reset to page 1 when filters change
    params.delete('page');
    
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  // Handle category checkbox change
  const handleCategoryChange = useCallback((categoryId: string, checked: boolean) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(categoryId);
      } else {
        newSet.delete(categoryId);
      }
      
      // Update URL immediately
      const categoryIds = Array.from(newSet);
      const attributeFilters: Record<string, string[]> = {};
      for (const [attrId, valueIds] of Object.entries(selectedAttributes)) {
        attributeFilters[attrId] = Array.from(valueIds);
      }
      updateFilters(categoryIds, attributeFilters);
      
      return newSet;
    });
  }, [selectedAttributes, updateFilters]);

  // Handle attribute value checkbox change
  const handleAttributeChange = useCallback((attributeId: string, valueId: string, checked: boolean) => {
    setSelectedAttributes(prev => {
      const newAttrs = { ...prev };
      if (!newAttrs[attributeId]) {
        newAttrs[attributeId] = new Set();
      }
      
      if (checked) {
        newAttrs[attributeId].add(valueId);
      } else {
        newAttrs[attributeId].delete(valueId);
        // Remove empty sets
        if (newAttrs[attributeId].size === 0) {
          delete newAttrs[attributeId];
        }
      }
      
      // Update URL immediately
      const categoryIds = Array.from(selectedCategories);
      const attributeFilters: Record<string, string[]> = {};
      for (const [attrId, valueIds] of Object.entries(newAttrs)) {
        attributeFilters[attrId] = Array.from(valueIds);
      }
      updateFilters(categoryIds, attributeFilters);
      
      return newAttrs;
    });
  }, [selectedCategories, updateFilters]);

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
            onClick={() => fetchProducts(currentPage, currentLimit, currentSort)}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Don't return early - always show filters even when no products
  const hasNoProducts = products.length === 0 && !isLoading;

  const pageNumbers = getPageNumbers();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Mobile Filter Toggle Button */}
      <div className="md:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full justify-between"
        >
          <span>Filters</span>
          {showFilters ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar - Popular E-commerce Layout */}
        <aside className={`w-full md:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h2 className="text-lg font-semibold">Filters</h2>
              {(selectedCategories.size > 0 || Object.keys(selectedAttributes).length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategories(new Set());
                    setSelectedAttributes({});
                    updateFilters([], {});
                  }}
                  className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Categories Section */}
            {categories.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, categories: !prev.categories }))}
                  className="flex items-center justify-between w-full mb-3 group"
                >
                  <h3 className="text-base font-semibold text-gray-900">
                    Categories
                    {selectedCategories.size > 0 && (
                      <span className="ml-2 text-xs font-normal text-primary">
                        ({selectedCategories.size})
                      </span>
                    )}
                  </h3>
                  {expandedSections.categories ? (
                    <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.categories && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {categories.map((category) => {
                      const isChecked = selectedCategories.has(category.id);
                      return (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleCategoryChange(category.id, checked === true)}
                            className="cursor-pointer"
                          />
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                            onClick={() => handleCategoryChange(category.id, !isChecked)}
                          >
                            {category.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Attributes Section */}
            {attributes.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, attributes: !prev.attributes }))}
                  className="flex items-center justify-between w-full mb-3 group"
                >
                  <h3 className="text-base font-semibold text-gray-900">
                    Filter by
                    {Object.keys(selectedAttributes).length > 0 && (
                      <span className="ml-2 text-xs font-normal text-primary">
                        ({Object.values(selectedAttributes).reduce((sum, set) => sum + set.size, 0)})
                      </span>
                    )}
                  </h3>
                  {expandedSections.attributes ? (
                    <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.attributes && (
                  <div className="space-y-6">
                    {attributes.map((attribute) => (
                      <div key={attribute.id} className="pb-4 border-b last:border-b-0">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">{attribute.name}</h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {attribute.attribute_values.map((value) => {
                            const isColor = attribute.type === 'color';
                            const isChecked = selectedAttributes[attribute.id]?.has(value.id) || false;
                            return (
                              <div key={value.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`attr-${attribute.id}-${value.id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handleAttributeChange(attribute.id, value.id, checked === true)}
                                  className="cursor-pointer"
                                />
                                <Label
                                  htmlFor={`attr-${attribute.id}-${value.id}`}
                                  className="text-sm text-gray-700 cursor-pointer flex-1 flex items-center gap-2"
                                  onClick={() => handleAttributeChange(attribute.id, value.id, !isChecked)}
                                >
                                  {isColor && value.color_code && (
                                    <span
                                      className="w-4 h-4 rounded-full border border-gray-300"
                                      style={{ backgroundColor: value.color_code }}
                                      aria-label={value.value}
                                    />
                                  )}
                                  <span>{value.value}</span>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
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

      {/* Sort Tabs - Same style as Product Tabs Section */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b">
        <span className="text-sm font-medium text-muted-foreground mr-2">Sort by:</span>
        <button
          onClick={() => updateURL({ sort: 'popular' })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentSort === 'popular' || (!currentSort && currentSort !== 'new' && currentSort !== 'low_price')
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          disabled={isLoading}
        >
          Popular
        </button>
        <button
          onClick={() => updateURL({ sort: 'new' })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentSort === 'new'
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          disabled={isLoading}
        >
          Newly Added
        </button>
        <button
          onClick={() => updateURL({ sort: 'low_price' })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentSort === 'low_price'
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          disabled={isLoading}
        >
          Low Price
        </button>
      </div>

      {/* Products Grid */}
      {hasNoProducts ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">No products found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or clearing them to see more products.
          </p>
        </div>
      ) : isLoading && products.length > 0 ? (
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
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(ProductsListingClient);
