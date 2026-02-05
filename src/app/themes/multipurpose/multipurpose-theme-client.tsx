'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ImageWithFallback } from '@/components/marketing/image-with-fallback';
import { ChevronRight, ChevronDown, Search, X } from 'lucide-react';

const DEFAULT_PRICING_URL = 'https://www.dukanest.com/pricing';

type BusinessTypeDemo = {
  id: string;
  businessType: string;
  title: string;
  image: string;
  demoUrl: string | null;
  description?: string;
};

const BUSINESS_TYPE_DEMOS: BusinessTypeDemo[] = [
  {
    id: 'electronics',
    businessType: 'electronics',
    title: 'Electronics',
    image: '/images/themes/electronics_multipurpose.png',
    demoUrl: 'https://electronics.dukanest.com/',
    description: 'Tech and gadgets store',
  },
  {
    id: 'grocery',
    businessType: 'grocery',
    title: 'Grocery',
    image: '/images/themes/grocery_multipurpose.png',
    demoUrl: 'https://grocery.dukanest.com/',
    description: 'Fresh produce and daily essentials',
  },
  {
    id: 'pharmacy',
    businessType: 'pharmacy',
    title: 'Pharmacy',
    image: '/images/themes/pharmacy_multipurpose.png',
    demoUrl: 'https://pharmacy.dukanest.com/',
    description: 'Medications and wellness products',
  },
  {
    id: 'fashion',
    businessType: 'fashion',
    title: 'Fashion',
    image: '/images/themes/clothes.png',
    demoUrl: null,
    description: 'Apparel and accessories',
  },
  {
    id: 'furniture',
    businessType: 'furniture',
    title: 'Furniture',
    image: '/images/themes/furniture.png',
    demoUrl: null,
    description: 'Home and office furniture',
  },
  {
    id: 'beauty',
    businessType: 'beauty',
    title: 'Beauty',
    image: '/images/themes/general.png',
    demoUrl: null,
    description: 'Beauty and personal care',
  },
  {
    id: 'automotive',
    businessType: 'automotive',
    title: 'Automotive',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
    demoUrl: null,
    description: 'Auto parts and accessories',
  },
];

const ALL_BUSINESS_TYPES = 'all';

export default function MultipurposeThemeClient() {
  const [filter, setFilter] = useState<string>(ALL_BUSINESS_TYPES);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredDemos = useMemo(() => {
    if (filter === ALL_BUSINESS_TYPES) return BUSINESS_TYPE_DEMOS;
    return BUSINESS_TYPE_DEMOS.filter((d) => d.businessType === filter);
  }, [filter]);

  const businessTypeOptions = useMemo(
    () => [
      { value: ALL_BUSINESS_TYPES, label: 'All Industries', description: 'View all business types' },
      ...BUSINESS_TYPE_DEMOS.map((d) => ({ 
        value: d.businessType, 
        label: d.title,
        description: d.description || ''
      })),
    ],
    []
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return businessTypeOptions;
    const query = searchQuery.toLowerCase();
    return businessTypeOptions.filter(
      (opt) => 
        opt.label.toLowerCase().includes(query) || 
        opt.description.toLowerCase().includes(query)
    );
  }, [businessTypeOptions, searchQuery]);

  // Get current selection label
  const currentSelection = businessTypeOptions.find((opt) => opt.value === filter);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    setFilter(value);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back */}
        <div className="mb-8">
          <Link
            href="/#themes"
            className="text-sm text-[#0025cc] hover:underline inline-flex items-center gap-1"
          >
            ← Back to themes
          </Link>
        </div>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-[#0025cc] font-medium mb-2">Multipurpose Theme</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            One theme, every business type
          </h1>
          <p className="text-lg text-[#8d8d8d]">
            See how the Multipurpose theme looks for different industries. Click a card to preview
            the live demo.
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex justify-center mb-10">
          <div ref={dropdownRef} className="relative w-full max-w-md">
            {/* Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#0025cc]/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {currentSelection?.label || 'Select Industry'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {filter === ALL_BUSINESS_TYPES 
                      ? `${BUSINESS_TYPE_DEMOS.length} industries available` 
                      : currentSelection?.description}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {/* Search Input */}
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search industries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0025cc]/20 focus:border-[#0025cc]"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          filter === opt.value ? 'bg-[#0025cc]/5' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${filter === opt.value ? 'bg-[#0025cc]' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${filter === opt.value ? 'text-[#0025cc]' : 'text-gray-900'}`}>
                            {opt.label}
                          </p>
                          {opt.description && (
                            <p className="text-xs text-gray-500 truncate">{opt.description}</p>
                          )}
                        </div>
                        {filter === opt.value && (
                          <span className="text-[#0025cc] text-xs font-medium">Selected</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No industries found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDemos.map((demo) => {
            const hasDemo = !!demo.demoUrl;
            return (
              <div
                key={demo.id}
                className={`group relative bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                  hasDemo ? 'hover:shadow-2xl hover:-translate-y-1' : 'opacity-90'
                }`}
              >
                {!hasDemo && (
                  <div className="absolute top-4 right-4 z-10 bg-[#0025cc] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    Coming Soon
                  </div>
                )}
                <div className="relative h-72 overflow-hidden bg-[#e7e9eb]">
                  <ImageWithFallback
                    src={demo.image}
                    alt={demo.title}
                    className={`w-full h-full object-cover object-top transition-transform duration-500 ${
                      hasDemo ? 'group-hover:scale-105' : 'grayscale'
                    }`}
                  />
                  {hasDemo ? (
                    <Link
                      href={demo.demoUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                    >
                      <span className="bg-white text-[#0025cc] px-6 py-3 rounded-lg font-medium flex items-center gap-2">
                        Preview demo
                        <ChevronRight className="w-5 h-5" />
                      </span>
                    </Link>
                  ) : (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="text-white font-medium">Coming Soon</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-[#0c0528]">{demo.title}</h3>
                  {demo.description && (
                    <p className="text-sm text-[#8d8d8d] mt-1">{demo.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-[#8d8d8d] mb-4">Ready to build your store with this theme?</p>
          <Link
            href={DEFAULT_PRICING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg font-medium hover:shadow-lg transition-shadow"
          >
            Create your own store
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
