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
  // Initialize state with initialProducts - this ensures products are available immediately
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const initialProductsRef = useRef(initialProducts);
  const hasInitializedRef = useRef(false);
  const hasLoggedInitialRender = useRef(false);

  // Log initial render only once (moved from component body to prevent infinite logs)
  useEffect(() => {
    if (!hasLoggedInitialRender.current) {
      hasLoggedInitialRender.current = true;
      console.log('[ProductsListing] Component mounted (first render)', {
        initialProductsCount: initialProducts.length,
        productsStateCount: products.length,
        initialTotal,
        hasProducts: products.length > 0 || initialProducts.length > 0,
      });
    }
  }, []); // Empty deps - only run once on mount

  // Ensure products are set immediately from initialProducts
  // Use a ref to track the last synced initialProducts to avoid infinite loops
  const lastSyncedInitialProductsRef = useRef<string>('');
  useEffect(() => {
    // Create a stable key from initialProducts to detect changes
    const initialProductsKey = initialProducts.length > 0 
      ? initialProducts.map(p => p.id).join(',')
      : 'empty';
    
    // Only sync if initialProducts actually changed
    if (lastSyncedInitialProductsRef.current !== initialProductsKey) {
      console.log('[ProductsListing] Syncing products from initialProducts', {
        initialProductsCount: initialProducts.length,
        currentProductsCount: products.length,
        initialTotal,
      });
      setProducts(initialProducts);
      setTotal(initialTotal);
      lastSyncedInitialProductsRef.current = initialProductsKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts, initialTotal]);

  // Log detailed initial state - only once on mount (consolidated with other mount log)
  useEffect(() => {
    if (!hasLoggedInitialRender.current) {
      console.log('[ProductsListing] Detailed mount info', {
        initialProductsCount: initialProducts.length,
        initialTotal,
        initialPage,
        initialSearch,
        initialCategory,
        firstProduct: initialProducts[0] ? {
          id: initialProducts[0].id,
          name: initialProducts[0].name,
          price: initialProducts[0].price,
          hasImage: !!initialProducts[0].image,
        } : null,
      });
      
      if (initialProducts.length === 0) {
        console.warn('[ProductsListing] WARNING: No initial products received from server');
      }
    }
  }, []); // Empty deps - only run once
  
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

  // Mark as initialized after mount - only run once
  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    // Mark as initialized after a short delay to allow initial render
    const timer = setTimeout(() => {
      setIsInitialMount(false);
      hasInitializedRef.current = true;
    }, 200);
    
    return () => clearTimeout(timer);
  }, []); // Empty deps - only run once on mount

  // Update products when initialProducts change (e.g., from server-side navigation)
  // Only update if the products actually changed (not just a re-render with same data)
  useEffect(() => {
    // Check if initialProducts actually changed by comparing IDs
    const currentIds = initialProducts.map(p => p.id).join(',');
    const previousIds = initialProductsRef.current.map(p => p.id).join(',');
    
    // Only update if products actually changed
    if (currentIds !== previousIds || initialProducts.length !== initialProductsRef.current.length) {
      console.log('[ProductsListing] Products changed, updating state', {
        newProductsCount: initialProducts.length,
        oldProductsCount: initialProductsRef.current.length,
      });
      setProducts(initialProducts);
      setTotal(initialTotal);
      initialProductsRef.current = initialProducts;
    }
  }, [initialProducts, initialTotal]); // Removed products.length to prevent loop

  // Ensure URL has page=1 when page parameter is missing (fixes loading issue)
  // Use a ref to prevent multiple updates and ensure products are displayed first
  const urlUpdatedRef = useRef(false);
  useEffect(() => {
    // Only update URL after products are set to avoid blocking render
    if (products.length > 0 || initialProducts.length > 0) {
      const currentPage = searchParams.get('page');
      // If page parameter is missing and we're on page 1, update URL to include it
      // Only do this once to avoid infinite loops
      if (!urlUpdatedRef.current && !currentPage && initialPage === 1) {
        urlUpdatedRef.current = true;
        // Use setTimeout to ensure this happens after render
        setTimeout(() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('page', '1');
          router.replace(`/products?${params.toString()}`, { scroll: false });
        }, 0);
      }
    }
  }, [searchParams, initialPage, router, products.length, initialProducts.length]);
  
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
    console.log('[ProductsListing] updateFilters called', {
      isInitialMount,
      hasInitialized: hasInitializedRef.current,
    });

    // Don't update filters on initial mount - use initialProducts from server
    if (isInitialMount || !hasInitializedRef.current) {
      console.log('[ProductsListing] Skipping updateFilters - still initializing');
      return;
    }
    
    startTransition(() => {
      console.log('[ProductsListing] Starting filter update');
      setIsSearching(true);
      const params = new URLSearchParams(searchParams.toString());
      
      // Store original params to compare later
      const originalParams = new URLSearchParams(searchParams.toString());
      
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

      // Always ensure page parameter is set (defaults to 1 if missing)
      if (!params.get('page')) {
        params.set('page', '1');
      } else {
        params.set('page', params.get('page') || '1'); // Ensure it's always set
      }
      
      // Check if params actually changed - if not, don't fetch or update URL
      const paramsChanged = params.toString() !== originalParams.toString();
      console.log('[ProductsListing] Filter update check', {
        paramsChanged,
        newParams: params.toString(),
        originalParams: originalParams.toString(),
      });
      
      if (!paramsChanged) {
        console.log('[ProductsListing] Params unchanged, skipping fetch');
        setIsSearching(false);
        return;
      }
      
      const apiUrl = `/api/products?${params.toString()}`;
      console.log('[ProductsListing] Fetching products from API', { apiUrl });
      
      // Fetch updated products from API first, then navigate
      fetch(apiUrl)
        .then(res => {
          console.log('[ProductsListing] API response received', {
            ok: res.ok,
            status: res.status,
            statusText: res.statusText,
          });
          if (!res.ok) {
            throw new Error(`Failed to fetch products: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('[ProductsListing] API data received', {
            hasProducts: !!data.products,
            productsCount: data.products?.length || 0,
            total: data.pagination?.total || 0,
            dataKeys: Object.keys(data),
          });
          
          if (data.products && Array.isArray(data.products)) {
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
            console.log('[ProductsListing] Setting products from API', {
              mappedProductsCount: mappedProducts.length,
              total: data.pagination?.total || 0,
            });
            setProducts(mappedProducts);
            setTotal(data.pagination?.total || 0);
          } else {
            console.warn('[ProductsListing] No products in API response, clearing products');
            // Only clear products if we explicitly got an empty result, not on error
            setProducts([]);
            setTotal(0);
          }
          setIsSearching(false);
        })
        .catch(err => {
          console.error('[ProductsListing] Error fetching products:', err);
          // Don't clear products on error - keep existing products visible
          // Only clear if we're sure there are no products
          setIsSearching(false);
        });
      
      // Update URL without causing a full page navigation
      // Use replace to avoid adding to history and triggering unnecessary re-renders
      // Only update URL if it actually changed to prevent unnecessary re-renders
      const currentUrl = `/products?${searchParams.toString()}`;
      const newUrl = `/products?${params.toString()}`;
      if (currentUrl !== newUrl) {
        router.replace(newUrl, { scroll: false });
      }
    });
  }, [debouncedSearch, selectedCategories, priceRange, selectedAttributeValues, sortBy, sortOrder, searchParams, router, initialCategories, isInitialMount]);

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Auto-search when debounced search changes (only after initial mount)
  useEffect(() => {
    console.log('[ProductsListing] Debounced search effect', {
      debouncedSearch,
      initialSearch,
      isInitialMount,
      hasInitialized: hasInitializedRef.current,
      searchChanged: debouncedSearch.trim() !== initialSearch.trim(),
    });

    // Don't trigger on initial mount - wait until component is fully initialized
    if (isInitialMount || !hasInitializedRef.current) {
      console.log('[ProductsListing] Skipping search update - still initializing');
      return;
    }
    
    // Only update if search actually changed (not just reference equality)
    if (debouncedSearch.trim() !== initialSearch.trim()) {
      console.log('[ProductsListing] Search changed, calling updateFilters');
      updateFilters();
    }
  }, [debouncedSearch, updateFilters, initialSearch, isInitialMount]);

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
    console.log('[ProductsListing] Filter state changed', {
      selectedCategoriesCount: selectedCategories.length,
      priceRange,
      selectedAttributeValuesCount: Object.keys(selectedAttributeValues).length,
      isInitialMount,
      hasInitialized: hasInitializedRef.current,
    });

    // Don't trigger on initial mount - use initialProducts from server
    if (isInitialMount || !hasInitializedRef.current) {
      console.log('[ProductsListing] Skipping filter update - still initializing');
      return;
    }

    const timer = setTimeout(() => {
      console.log('[ProductsListing] Debounced filter update triggered');
      updateFilters();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, priceRange, selectedAttributeValues, isInitialMount]);

  // Log render state
  // Debug: Log render state only when key values change (not on every render)
  useEffect(() => {
    console.log('[ProductsListing] Render state', {
      productsCount: products.length,
      initialProductsCount: initialProducts.length,
      total,
      isSearching,
      isInitialMount,
      hasInitialized: hasInitializedRef.current,
    });
  }, [products.length, initialProducts.length, total, isSearching, isInitialMount]);

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
          {(() => {
            // Determine which products to display - prioritize products state, fallback to initialProducts
            const productsToDisplay = products.length > 0 ? products : initialProducts;
            
            // Debug: Log what will be displayed
            console.log('[ProductsListing] Rendering products grid', {
              productsToDisplayCount: productsToDisplay.length,
              productsStateCount: products.length,
              initialProductsCount: initialProducts.length,
              isSearching,
              total,
            });
            
            // Show loading skeleton only if actively searching AND no products available
            if (isSearching && productsToDisplay.length === 0) {
              return (
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
              );
            }
            
            // Show "No products" message only if we have no products at all
            if (productsToDisplay.length === 0) {
              return (
                <div className="text-center py-12">
                  <p className="text-[rgba(0,0,0,0.6)] text-[16px]">No products found</p>
                  {/* Always show debug info to help troubleshoot production issues */}
                  <p className="text-xs text-muted-foreground mt-2">
                    Debug: initialProducts={initialProducts.length}, products={products.length}, total={total}, isInitialMount={isInitialMount.toString()}, isSearching={isSearching.toString()}
                  </p>
                </div>
              );
            }
            
            // Show products with error boundary
            // Debug: Add visible test to verify products are being rendered
            console.log('[ProductsListing] About to render products grid', {
              productsToDisplayCount: productsToDisplay.length,
              willRender: productsToDisplay.length > 0,
              firstProduct: productsToDisplay[0] ? {
                id: productsToDisplay[0].id,
                name: productsToDisplay[0].name,
              } : null,
            });
            
            return (
              <>
                {/* Debug: Visible indicator that products should be showing */}
                {productsToDisplay.length > 0 && (
                  <div style={{ 
                    position: 'fixed', 
                    top: '60px', 
                    left: 0, 
                    zIndex: 9999, 
                    background: 'green', 
                    color: 'white', 
                    padding: '4px 8px', 
                    fontSize: '12px' 
                  }}>
                    Products Grid Rendering - {productsToDisplay.length} products
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8" style={{ position: 'relative', zIndex: 1 }}>
                  {productsToDisplay.map((product: any) => {
                    try {
                      return (
                        <ThemeProductCard
                          key={product.id}
                          product={product}
                        />
                      );
                    } catch (error) {
                      console.error('[ProductsListing] Error rendering product card:', product?.id, error);
                      // Return a fallback card if rendering fails
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
            );
          })()}
        </div>
      </div>
    </div>
  );
}
