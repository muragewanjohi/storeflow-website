'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ImageWithFallback } from '@/components/marketing/image-with-fallback';
import { ChevronRight } from 'lucide-react';

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

  const filteredDemos = useMemo(() => {
    if (filter === ALL_BUSINESS_TYPES) return BUSINESS_TYPE_DEMOS;
    return BUSINESS_TYPE_DEMOS.filter((d) => d.businessType === filter);
  }, [filter]);

  const businessTypeOptions = useMemo(
    () => [
      { value: ALL_BUSINESS_TYPES, label: 'All' },
      ...BUSINESS_TYPE_DEMOS.map((d) => ({ value: d.businessType, label: d.title })),
    ],
    []
  );

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

        {/* Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {businessTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-[#0025cc] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
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
