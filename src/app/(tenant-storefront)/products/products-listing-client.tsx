/**
 * Products Listing Client Component - HexFashion Theme
 * 
 * Client-side product listing matching Figma design
 * Features: Breadcrumbs, Filters Sidebar, Product Grid, Pagination
 * 
 * Day 30: Tenant Storefront - Product Listing
 */

'use client';

import { useState, useTransition, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRightIcon, ChevronDownIcon, XMarkIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/lib/currency/currency-context';
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
  metadata?: Record<string, unknown>;
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
  currentCategory?: Category | null;
  themeSlug?: string;
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
  currentCategory,
  themeSlug = 'default',
}: Readonly<ProductsListingClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();
  
  // Removed excessive debug logging
  
  // Load theme-specific product card
  const ThemeProductCard = useMemo(() => {
    const CardComponent = loadThemeProductCard(themeSlug);
    return CardComponent || DefaultProductCard;
  }, [themeSlug]);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  // Simplified: Just use initialProducts directly, no complex state management
  const [products] = useState(initialProducts);
  const [total] = useState(initialTotal);

  // Simplified: Remove complex initialization logic
  
  // Simplified: Basic filter states only
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string[]>>({});
  const [attributes, setAttributes] = useState<Array<{ id: string; name: string; type: string | null; attribute_values: Array<{ id: string; value: string; color_code: string | null }> }>>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    price: true,
  });
  
  // Fetch attributes on mount
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const response = await fetch('/api/attributes');
        if (response.ok) {
          const data = await response.json();
          setAttributes(data.attributes || []);
        }
      } catch (error) {
        console.error('Error fetching attributes:', error);
      }
    };
    fetchAttributes();
  }, []);

  const totalPages = Math.ceil(total / initialLimit);
  const startItem = (initialPage - 1) * initialLimit + 1;
  const endItem = Math.min(initialPage * initialLimit, total);

  // Sort options matching Figma
  const sortOptions = [
    { value: 'created_at', label: 'Newest' },
    { value: 'price', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'name', label: 'Name: A to Z' },
    { value: 'popular', label: 'Most Popular' },
  ];

  const currentSortLabel = sortOptions.find(opt => {
    if (opt.value === 'popular') return sortBy === 'created_at' && sortOrder === 'desc';
    if (opt.value === 'price_desc') return sortBy === 'price' && sortOrder === 'desc';
    return sortBy === opt.value && (opt.value === 'price' ? sortOrder === 'asc' : true);
  })?.label || 'Most Popular';

  // Simplified: Removed complex filtering logic - just display products from server

  const handleSortChange = (value: string) => {
    // Simplified: Just navigate to new URL with sort params - server will handle it
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'popular') {
      params.delete('sort');
      params.delete('order');
    } else if (value === 'price_desc') {
      params.set('sort', 'price');
      params.set('order', 'desc');
    } else if (value === 'price') {
      params.set('sort', 'price');
      params.set('order', 'asc');
    } else {
      params.set('sort', value);
      params.set('order', 'asc');
    }
    params.set('page', '1'); // Reset to page 1 when sorting
    router.push(`/products?${params.toString()}`);
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId)
        : [...prev, catId] // Allow multiple categories
    );
  };

  const toggleAttributeValue = (attributeId: string, valueId: string) => {
    setSelectedAttributeValues(prev => {
      const currentValues = prev[attributeId] || [];
      const newValues = currentValues.includes(valueId)
        ? currentValues.filter(id => id !== valueId)
        : [...currentValues, valueId];
      
      return {
        ...prev,
        [attributeId]: newValues,
      };
    });
  };

  // Debounce filter updates (300ms delay) - but only after initial mount
  // Simplified: Removed filter update effects - filters will be handled via URL navigation

  // Removed excessive debug logging

  // Ensure component always returns something visible - add test div to verify rendering
  return (
    <div className="container mx-auto px-4 md:px-4 py-6 md:py-8 max-w-[1440px]">
      {/* Debug: Always visible test to verify component is rendering */}
      {typeof window !== 'undefined' && (
        <div style={{ display: 'none' }} data-testid="products-listing-mounted">
          Products listing component mounted
        </div>
      )}
      {/* Breadcrumbs */}
      <div className="mb-4 md:mb-6 flex items-center gap-2 md:gap-3 text-[14px] md:text-[16px]">
        <Link href="/" className="text-[rgba(0,0,0,0.6)] hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-[rgba(0,0,0,0.6)] rotate-[-90deg]" />
        <span className="text-black font-medium">
          {currentCategory?.name || 'All Products'}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-[rgba(0,0,0,0.1)] mb-4 md:mb-6" />

      {/* Page Header with Title, Count, and Sort */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-3 md:gap-0">
        <h1 className="text-[24px] md:text-[32px] font-bold text-black">
          {currentCategory?.name || 'All Products'}
        </h1>
        <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
          <p className="text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)] hidden md:block">
            Showing {startItem}-{endItem} of {total} Products
          </p>
          <p className="text-[14px] text-[rgba(0,0,0,0.6)] md:hidden">
            Showing {startItem}-{endItem} of {total} Products
          </p>
          {/* Filter Icon Button - Mobile Only */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden bg-[#f0f0f0] rounded-[62px] p-4 w-8 h-8 flex items-center justify-center"
            aria-label="Toggle filters"
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowFilters(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content: Filters Sidebar + Product Grid */}
      <div className="flex gap-6 relative">
        {/* Filters Sidebar - Modern E-commerce Design */}
        <aside className={`fixed md:relative inset-y-0 left-0 md:inset-auto z-50 md:z-auto w-[280px] md:w-[280px] flex-shrink-0 ${showFilters ? 'block' : 'hidden'} lg:block bg-white md:bg-transparent`}>
          <div className="border border-[rgba(0,0,0,0.1)] rounded-lg md:rounded-lg p-4 md:p-6 bg-white h-full md:h-auto overflow-y-auto md:overflow-y-visible shadow-sm md:shadow-none">
            {/* Filters Header */}
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-4 border-b">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="md:hidden p-1 hover:bg-gray-100 rounded"
                aria-label="Close filters"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Categories Filter - Collapsible */}
            {initialCategories.length > 0 && (
              <div className="mb-4 md:mb-6 pb-4 border-b">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, categories: !prev.categories }))}
                  className="flex items-center justify-between w-full mb-3 group"
                >
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Categories</h3>
                  <ChevronDownIcon 
                    className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.categories ? 'rotate-180' : ''}`} 
                  />
                </button>
                {expandedSections.categories && (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                    {initialCategories.map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2.5 group/item">
                        <Checkbox
                          id={`category-${cat.id}`}
                          checked={selectedCategories.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Label
                          htmlFor={`category-${cat.id}`}
                          className="text-sm md:text-base text-gray-700 hover:text-gray-900 transition-colors cursor-pointer flex-1 group-hover/item:text-gray-900"
                        >
                          {cat.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Price Filter - Collapsible */}
            <div className="mb-4 md:mb-6 pb-4 border-b">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, price: !prev.price }))}
                className="flex items-center justify-between w-full mb-3 group"
              >
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Price</h3>
                <ChevronDownIcon 
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`} 
                />
              </button>
              {expandedSections.price && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">${priceRange[0].toFixed(0)}</span>
                    <span className="font-medium text-gray-700">${priceRange[1].toFixed(0)}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      style={{
                        background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(priceRange[1] / 1000) * 100}%, rgb(229 231 235) ${(priceRange[1] / 1000) * 100}%, rgb(229 231 235) 100%)`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Attributes Filters - Collapsible */}
            {attributes.map((attribute) => {
              const isExpanded = expandedSections[`attr-${attribute.id}`] !== false;
              const hasSelectedValues = (selectedAttributeValues[attribute.id] || []).length > 0;
              
              return (
                <div key={attribute.id} className="mb-4 md:mb-6 pb-4 border-b last:border-b-0">
                  <button
                    onClick={() => setExpandedSections(prev => ({ 
                      ...prev, 
                      [`attr-${attribute.id}`]: !prev[`attr-${attribute.id}`] 
                    }))}
                    className="flex items-center justify-between w-full mb-3 group"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900">{attribute.name}</h3>
                      {hasSelectedValues && (
                        <span className="text-xs font-medium bg-primary text-white px-2 py-0.5 rounded-full">
                          {(selectedAttributeValues[attribute.id] || []).length}
                        </span>
                      )}
                    </div>
                    <ChevronDownIcon 
                      className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {isExpanded && attribute.attribute_values.length > 0 && (
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto">
                      {attribute.attribute_values.map((value) => {
                        const isChecked = (selectedAttributeValues[attribute.id] || []).includes(value.id);
                        // Special handling for color attributes
                        const isColor = attribute.type === 'color';
                        const colorCode = value.color_code;
                        
                        return (
                          <div key={value.id} className="flex items-center space-x-2.5 group/item">
                            <Checkbox
                              id={`attr-${attribute.id}-${value.id}`}
                              checked={isChecked}
                              onCheckedChange={() => toggleAttributeValue(attribute.id, value.id)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label
                              htmlFor={`attr-${attribute.id}-${value.id}`}
                              className="text-sm md:text-base text-gray-700 hover:text-gray-900 transition-colors cursor-pointer flex-1 group-hover/item:text-gray-900 flex items-center gap-2"
                            >
                              {isColor && colorCode && (
                                <span 
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: colorCode }}
                                  aria-label={value.value}
                                />
                              )}
                              <span>{value.value}</span>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Clear Filters Button - Show when filters are active */}
            {(selectedCategories.length > 0 || 
              priceRange[0] > 0 || 
              priceRange[1] < 1000 || 
              Object.keys(selectedAttributeValues).some(key => selectedAttributeValues[key].length > 0)) && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategories([]);
                    setPriceRange([0, 1000]);
                    setSelectedAttributeValues({});
                  }}
                  className="w-full text-sm"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[rgba(0,0,0,0.6)] text-[16px]">No products found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                {products.map((product: any) => {
                  try {
                    return (
                      <ThemeProductCard
                        key={product.id}
                        product={product}
                      />
                    );
                  } catch (error) {
                    console.error('[ProductsListing] Error rendering product card:', product?.id, error);
                    return (
                      <div key={product.id} className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Error loading product</p>
                        <p className="text-xs text-muted-foreground mt-1">{product?.name || product?.id}</p>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 md:gap-6 mt-8 md:mt-12">
                  <Button
                    variant="outline"
                    disabled={initialPage === 1 || isPending}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set('page', String(initialPage - 1));
                      router.push(`/products?${params.toString()}`);
                    }}
                    className="border border-[rgba(0,0,0,0.1)] rounded-lg px-3.5 py-2 h-auto bg-white hover:bg-gray-50 text-[12px] md:text-[14px]"
                  >
                    <ChevronRightIcon className="w-4 h-4 md:w-5 md:h-5 rotate-180 mr-1 md:mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 10) {
                        pageNum = i + 1;
                      } else if (initialPage <= 5) {
                        pageNum = i + 1;
                      } else if (initialPage >= totalPages - 4) {
                        pageNum = totalPages - 9 + i;
                      } else {
                        pageNum = initialPage - 4 + i;
                      }
                      
                      if (i === 3 && totalPages > 10 && initialPage < totalPages - 5) {
                        return (
                          <span key="ellipsis" className="px-3 py-2 text-[14px] text-[rgba(0,0,0,0.5)]">
                            ...
                          </span>
                        );
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('page', String(pageNum));
                            router.push(`/products?${params.toString()}`);
                          }}
                          disabled={isPending}
                          className={`w-9 h-9 md:w-10 md:h-10 rounded-lg text-[12px] md:text-[14px] font-medium transition-colors ${
                            initialPage === pageNum
                              ? 'bg-[rgba(0,0,0,0.06)] text-black'
                              : 'text-[rgba(0,0,0,0.5)] hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
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
                    className="border border-[rgba(0,0,0,0.1)] rounded-lg px-3.5 py-2 h-auto bg-white hover:bg-gray-50 text-[12px] md:text-[14px]"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
