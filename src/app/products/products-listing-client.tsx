/**
 * Products Listing Client Component - HexFashion Theme
 * 
 * Client-side product listing matching Figma design
 * Features: Breadcrumbs, Filters Sidebar, Product Grid, Pagination
 * 
 * Day 30: Tenant Storefront - Product Listing
 */

'use client';

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const [isPending, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();
  
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
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // Initialize selected categories - map slugs to IDs if needed
  const getInitialSelectedCategories = () => {
    if (!initialCategory) return [];
    
    const categoryParams = initialCategory.split(',').filter(p => p.trim());
    const categoryIds: string[] = [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const param of categoryParams) {
      if (uuidRegex.test(param)) {
        // It's a UUID, use directly
        categoryIds.push(param);
      } else {
        // It's a slug, find matching category ID
        const category = initialCategories.find(cat => cat.slug === param);
        if (category) {
          categoryIds.push(category.id);
        }
      }
    }
    
    return categoryIds;
  };

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>(getInitialSelectedCategories());
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string[]>>({});
  const [attributes, setAttributes] = useState<Array<{ id: string; name: string; type: string | null; attribute_values: Array<{ id: string; value: string }> }>>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Mark initial mount as complete after first render
  useEffect(() => {
    // Use a small delay to ensure initialProducts are set
    const timer = setTimeout(() => {
      setIsInitialMount(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Update products when initialProducts change (e.g., from server-side navigation)
  useEffect(() => {
    if (initialProducts && initialProducts.length >= 0) {
      setProducts(initialProducts);
      setTotal(initialTotal);
    }
  }, [initialProducts, initialTotal]);

  // Ensure URL has page=1 when page parameter is missing (fixes loading issue)
  useEffect(() => {
    const currentPage = searchParams.get('page');
    // If page parameter is missing and we're on page 1, update URL to include it
    if (!currentPage && initialPage === 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');
      // Use replace to avoid adding to history
      router.replace(`/products?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, initialPage, router]);
  
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

  const updateFilters = useCallback(() => {
    startTransition(() => {
      setIsSearching(true);
      const params = new URLSearchParams(searchParams.toString());
      
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      } else {
        params.delete('search');
      }

      // Multiple categories support - use slugs for better SEO
      if (selectedCategories.length > 0) {
        // Map category IDs to slugs for URL
        const categorySlugs = selectedCategories
          .map(id => {
            const category = initialCategories.find(cat => cat.id === id);
            // Only use slug if it exists, otherwise skip (don't use ID as fallback)
            return category?.slug || null;
          })
          .filter((slug): slug is string => !!slug);
        
        if (categorySlugs.length > 0) {
          params.set('category', categorySlugs.join(','));
        } else {
          // If no slugs available, use IDs but ensure they're properly formatted
          const validIds = selectedCategories.filter(id => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(id) && !id.includes(',');
          });
          if (validIds.length > 0) {
            params.set('category', validIds.join(','));
          } else {
            params.delete('category');
          }
        }
      } else {
        params.delete('category');
      }

      // Price range filter
      if (priceRange[0] > 0 || priceRange[1] < 1000) {
        params.set('min_price', priceRange[0].toString());
        params.set('max_price', priceRange[1].toString());
      } else {
        params.delete('min_price');
        params.delete('max_price');
      }

      // Attribute filters
      Object.entries(selectedAttributeValues).forEach(([attributeId, values]) => {
        if (values.length > 0) {
          params.set(`attr_${attributeId}`, values.join(','));
        } else {
          params.delete(`attr_${attributeId}`);
        }
      });

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
      
      // Fetch updated products from API first, then navigate
      fetch(`/api/products?${params.toString()}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch products: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.products) {
            // Map sale_price to compareAtPrice correctly
            const mappedProducts = data.products.map((p: any) => {
              const regularPrice = Number(p.price) || 0;
              const salePrice = p.sale_price ? Number(p.sale_price) : null;
              
              if (salePrice && salePrice < regularPrice && salePrice > 0) {
                return {
                  ...p,
                  price: salePrice,
                  compareAtPrice: regularPrice,
                };
              } else {
                return {
                  ...p,
                  price: regularPrice,
                };
              }
            });
            setProducts(mappedProducts);
            setTotal(data.pagination?.total || 0);
          } else {
            setProducts([]);
            setTotal(0);
          }
          setIsSearching(false);
        })
        .catch(err => {
          console.error('Error fetching products:', err);
          setProducts([]);
          setTotal(0);
          setIsSearching(false);
        });
      
      // Navigate after fetching to update URL
      router.push(`/products?${params.toString()}`);
    });
  }, [debouncedSearch, selectedCategories, priceRange, selectedAttributeValues, sortBy, sortOrder, searchParams, router, initialCategories]);

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Auto-search when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== initialSearch) {
      updateFilters();
    }
  }, [debouncedSearch, updateFilters, initialSearch]);

  const handleSortChange = (value: string) => {
    if (value === 'popular') {
      setSortBy('created_at');
      setSortOrder('desc');
    } else if (value === 'price_desc') {
      setSortBy('price');
      setSortOrder('desc');
    } else if (value === 'price') {
      setSortBy('price');
      setSortOrder('asc');
    } else {
      setSortBy(value);
      setSortOrder('asc');
    }
    updateFilters();
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
  useEffect(() => {
    // Don't trigger on initial mount - use initialProducts from server
    if (isInitialMount) {
      return;
    }

    const timer = setTimeout(() => {
      updateFilters();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, priceRange, selectedAttributeValues, isInitialMount]);

  return (
    <div className="container mx-auto px-4 md:px-4 py-6 md:py-8 max-w-[1440px]">
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
        {/* Filters Sidebar */}
        <aside className={`fixed md:relative inset-y-0 left-0 md:inset-auto z-50 md:z-auto w-[295px] md:w-[295px] flex-shrink-0 ${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="border border-[rgba(0,0,0,0.1)] rounded-[20px] p-6 bg-white h-full md:h-auto overflow-y-auto md:overflow-y-visible">
            {/* Filters Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-bold text-black">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="md:hidden"
                aria-label="Close filters"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="h-px bg-[rgba(0,0,0,0.1)] mb-6" />

            {/* Categories Filter */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[20px] font-bold text-black">Categories</h3>
                <ChevronDownIcon className="w-4 h-4" />
              </div>
              <div className="space-y-3">
                {initialCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`category-${cat.id}`}
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <Label
                      htmlFor={`category-${cat.id}`}
                      className="text-[16px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors cursor-pointer flex-1"
                    >
                      {cat.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-[rgba(0,0,0,0.1)] mb-6" />

            {/* Price Filter */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[20px] font-bold text-black">Price</h3>
                <ChevronDownIcon className="w-4 h-4" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-medium text-black">${priceRange[0]}</span>
                  <span className="font-medium text-black">${priceRange[1]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full h-2 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="h-px bg-[rgba(0,0,0,0.1)] mb-6" />

            {/* Attributes Filters */}
            {attributes.map((attribute) => (
              <div key={attribute.id} className="mb-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[20px] font-bold text-black">{attribute.name}</h3>
                  <ChevronDownIcon className="w-4 h-4" />
                </div>
                <div className="space-y-3">
                  {attribute.attribute_values.map((value) => (
                    <div key={value.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`attr-${attribute.id}-${value.id}`}
                        checked={(selectedAttributeValues[attribute.id] || []).includes(value.id)}
                        onCheckedChange={() => toggleAttributeValue(attribute.id, value.id)}
                      />
                      <Label
                        htmlFor={`attr-${attribute.id}-${value.id}`}
                        className="text-[16px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors cursor-pointer flex-1"
                      >
                        {value.value}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-[rgba(0,0,0,0.1)] mt-6" />
              </div>
            ))}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {isSearching ? (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
                      <div className="aspect-square w-full bg-gray-200" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-6 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[rgba(0,0,0,0.6)] text-[16px]">No products found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                {products.map((product: any) => (
                  <ThemeProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
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
