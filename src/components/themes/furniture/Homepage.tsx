/**
 * Furniture Theme Homepage
 * 
 * Homepage component matching Figma design for Furniro furniture theme
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { DemoProduct } from '@/lib/themes/demo-content';
import FurnitureProductGrid from './ProductGrid';
import { usePreview } from '@/lib/themes/preview-context';

interface FurnitureHomepageProps {
  products?: DemoProduct[];
  categories?: Array<{ name: string; slug: string; description: string; image?: string }>;
}

export default function FurnitureHomepage({ products = [], categories = [] }: Readonly<FurnitureHomepageProps>) {
  const { onProductClick: onProductClickPreview } = usePreview();
  const [currentInspiration, setCurrentInspiration] = useState(0);

  const featuredProducts = products.slice(0, 8);

  // Wrap preview callback to match ProductGrid signature
  const handleProductClick = onProductClickPreview
    ? (product: any) => {
        onProductClickPreview(product.id || product.sku || product.slug || '');
      }
    : undefined;
  
  // Category images - using placeholder images
  const categoryImages = [
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop',
  ];

  const inspirations = [
    {
      number: '01',
      category: 'Bed Room',
      title: 'Inner Peace',
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop',
    },
  ];

  return (
    <div className="furniture-homepage bg-white">
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[800px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1440&h=800&fit=crop"
            alt="Furniture Collection"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-[#44aee8] opacity-20"></div>
        
        <div className="container mx-auto px-4 h-full flex items-center">
          <div className="relative z-10 max-w-[643px] bg-[#fff3e3] rounded-[10px] p-12">
            <p className="text-[16px] font-semibold text-[#333] mb-4 tracking-[3px] uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>
              New Arrival
            </p>
            <h1 className="text-[52px] font-bold text-[#B88E2F] mb-6 leading-[65px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Discover Our<br />New Collection
            </h1>
            <p className="text-[18px] font-medium text-[#333] mb-8 leading-[24px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis.
            </p>
            <Button
              className="bg-[#B88E2F] text-white px-[72px] py-[25px] text-[16px] font-bold uppercase hover:bg-[#a67d1e] transition-colors"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </section>

      {/* Browse The Range Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-[32px] font-bold text-[#333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Browse The Range
            </h2>
            <p className="text-[20px] text-[#666] max-w-[559px] mx-auto" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['Dining', 'Living', 'Bedroom'].map((category, index) => (
              <Link
                key={category}
                href={`/collections/${encodeURIComponent(category.toLowerCase())}`}
                className="group"
              >
                <div className="relative h-[550px] md:h-[600px] rounded-lg overflow-hidden mb-4">
                  <img
                    src={categoryImages[index] || categoryImages[0]}
                    alt={category}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-[24px] font-semibold text-[#333] text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {category}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Our Products Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-[40px] font-bold text-[#3a3a3a] text-center mb-12" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Our Products
          </h2>

          <FurnitureProductGrid
            products={featuredProducts.map((p: any) => ({
              id: p.sku || p.id,
              name: p.name,
              slug: p.sku?.toLowerCase().replace(/\s+/g, '-') || p.id,
              price: p.price,
              sale_price: p.compareAtPrice ? p.price : undefined,
              image: p.image,
              stock_quantity: p.stock_quantity,
              metadata: {
                description: p.description || 'Furniture item',
                isNew: p.metadata?.isNew,
              },
            }))}
            columns={4}
            onProductClick={handleProductClick}
          />

          <div className="text-center mt-12">
            <Button
              variant="outline"
              className="border border-[#B88E2F] text-[#B88E2F] px-[72px] py-3 text-[16px] font-semibold hover:bg-[#B88E2F] hover:text-white transition-colors"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Show More
            </Button>
          </div>
        </div>
      </section>

      {/* 50+ Beautiful rooms inspiration Section */}
      <section className="py-16 md:py-24 bg-[#fcf8f3]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-[40px] font-bold text-[#3a3a3a] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                50+ Beautiful rooms<br />inspiration
              </h2>
              <p className="text-[16px] font-medium text-[#616161] mb-8 max-w-[368px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Our designer already made a lot of beautiful prototipe of rooms that inspire you
              </p>
              <Button
                className="bg-[#B88E2F] text-white px-[72px] py-3 text-[16px] font-semibold hover:bg-[#a67d1e] transition-colors"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Explore More
              </Button>
            </div>

            <div className="relative">
              <div className="relative h-[582px] rounded-lg overflow-hidden">
                <img
                  src={inspirations[currentInspiration].image}
                  alt={inspirations[currentInspiration].title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-72 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[16px] font-medium text-[#616161]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {inspirations[currentInspiration].number}
                    </span>
                    <span className="text-[#616161]">—</span>
                    <span className="text-[16px] font-medium text-[#616161]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {inspirations[currentInspiration].category}
                    </span>
                  </div>
                  <h3 className="text-[28px] font-semibold text-[#3a3a3a]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {inspirations[currentInspiration].title}
                  </h3>
                </div>
              </div>
              <div className="absolute bottom-6 right-6 w-12 h-12 bg-[#B88E2F] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#a67d1e] transition-colors">
                <ArrowRightIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Share your setup Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-[20px] font-semibold text-[#616161] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Share your setup with
            </p>
            <h2 className="text-[40px] font-bold text-[#3a3a3a]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              #FuniroFurniture
            </h2>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                className="relative h-[200px] md:h-[300px] rounded-lg overflow-hidden group cursor-pointer"
              >
                <img
                  src={`https://images.unsplash.com/photo-${1556900000 + i}?w=400&h=400&fit=crop`}
                  alt={`Furniture setup ${i}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

