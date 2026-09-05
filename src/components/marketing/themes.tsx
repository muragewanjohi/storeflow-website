'use client';

import Link from 'next/link';
import { ImageWithFallback } from './image-with-fallback';

type ThemeTemplate = {
  name: string;
  image: string;
  color: string;
  available: boolean;
  /** Link to theme detail page (e.g. /themes/multipurpose) or direct demo URL */
  previewUrl?: string;
};

const templates: ThemeTemplate[] = [
  {
    name: 'Multipurpose Theme',
    image: '/images/themes/multipurpose.png',
    color: 'from-blue-500 to-cyan-500',
    available: true,
    previewUrl: '/themes/multipurpose',
  },
  {
    name: 'Fashion Theme',
    image: '/images/themes/clothes.png',
    color: 'from-pink-500 to-rose-500',
    available: false
  },
  {
    name: 'Grocery Theme',
    image: '/images/themes/grocery.png',
    color: 'from-green-500 to-emerald-500',
    available: false,
  },
  {
    name: 'Electronics Theme',
    image: '/images/themes/electronics.png',
    color: 'from-blue-500 to-cyan-500',
    available: false
  },
];

export function Themes() {
  return (
    <section id="themes" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Professional Designs, Zero Coding</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
            Pick a Theme, Add Your Products,{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Start Selling
            </span>
          </h2>
          <p className="text-[#8d8d8d] mt-4">
            Beautiful, mobile-friendly store templates designed for African businesses. More themes coming soon.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  {/* Preview Button Overlay - Only show for available themes with a preview URL */}
                  {isAvailable && template.previewUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                      <Link
                        href={template.previewUrl}
                        {...(template.previewUrl.startsWith('http')
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
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
