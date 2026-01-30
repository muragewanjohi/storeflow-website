'use client';

import Link from 'next/link';
import { ImageWithFallback } from './image-with-fallback';

const DEMO_STORE_URL = 'https://electronics.dukanest.com/';

type ThemeTemplate = {
  name: string;
  image: string;
  color: string;
  available: boolean;
  previewUrl?: string;
};

const templates: ThemeTemplate[] = [
  {
    name: 'Multipurpose Theme',
    image: '/images/themes/multipurpose.png',
    color: 'from-blue-500 to-cyan-500',
    available: true,
    previewUrl: DEMO_STORE_URL,
  },
  {
    name: 'Grocery Theme',
    image: '/images/themes/grocery.png',
    color: 'from-green-500 to-emerald-500',
    available: false,
  },
  {
    name: 'Fashion Theme',
    image: '/images/themes/clothes.png',
    color: 'from-pink-500 to-rose-500',
    available: false
  },
  {
    name: 'Electronics Theme',
    image: '/images/themes/electronics.png',
    color: 'from-blue-500 to-cyan-500',
    available: false
  },
  {
    name: 'Furniture Theme',
    image: '/images/themes/furniture.png',
    color: 'from-amber-500 to-orange-500',
    available: false
  },
  {
    name: 'Beauty Theme',
    image: '/images/themes/general.png',
    color: 'from-red-500 to-pink-500',
    available: false
  },
  {
    name: 'Automotive Theme',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
    color: 'from-yellow-500 to-amber-500',
    available: false
  },
  {
    name: 'Books & Media Theme',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    color: 'from-teal-500 to-cyan-500',
    available: false
  },
  {
    name: 'Kids Theme',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
    color: 'from-violet-500 to-purple-500',
    available: false
  },
  {
    name: 'Health & Wellness Theme',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    color: 'from-emerald-500 to-teal-500',
    available: false
  },
  {
    name: 'Pet Supplies Theme',
    image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
    color: 'from-orange-500 to-red-500',
    available: false
  },
  {
    name: 'Food & Beverage Theme',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    color: 'from-rose-500 to-pink-500',
    available: false
  }
];

export function Themes() {
  return (
    <section id="themes" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Tailored to Your Business Style</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            Choose Your Preferred{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Theme
            </span>
          </h2>
          <p className="text-[#8d8d8d] mt-4">
            Explore our professionally designed templates and find the perfect match for your online store
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template, index) => {
            const isAvailable = template.available;
            return (
              <div
                key={index}
                className={`group relative bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                  isAvailable
                    ? 'hover:shadow-2xl transform hover:-translate-y-2'
                    : 'opacity-75 cursor-default'
                }`}
              >
                {/* Coming Soon Badge */}
                {!isAvailable && (
                  <div className="absolute top-4 right-4 z-10 bg-[#0025cc] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    Coming Soon
                  </div>
                )}

                {/* Template Image */}
                <div className="relative h-80 overflow-hidden bg-[#e7e9eb]">
                  <ImageWithFallback
                    src={template.image}
                    alt={template.name}
                    className={`w-full h-full object-cover object-top transition-transform duration-500 ${
                      isAvailable ? 'group-hover:scale-110' : 'grayscale'
                    }`}
                  />
                  {/* Preview Button Overlay - Only show for available themes with a demo URL */}
                  {isAvailable && template.previewUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                      <Link
                        href={template.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-[#0025cc] px-6 py-3 rounded-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-all hover:bg-[#0025cc] hover:text-white"
                      >
                        Preview Theme
                      </Link>
                    </div>
                  )}
                  {/* Coming Soon Overlay - Show for unavailable themes */}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="text-white font-medium text-lg">Coming Soon</span>
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <h3 className={`text-xl font-semibold text-center transition-colors ${
                    isAvailable
                      ? 'text-[#0c0528] group-hover:text-[#0025cc]'
                      : 'text-[#8d8d8d]'
                  }`}>
                    {template.name}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
