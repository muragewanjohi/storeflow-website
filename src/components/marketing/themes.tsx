'use client';

import { ImageWithFallback } from './image-with-fallback';

const templates = [
  {
    name: 'Multipurpose Theme',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    name: 'Grocery Theme',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&q=80',
    color: 'from-green-500 to-emerald-500'
  },
  {
    name: 'Fashion Theme',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    color: 'from-pink-500 to-rose-500'
  },
  {
    name: 'Electronics Theme',
    image: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&q=80',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    name: 'Furniture Theme',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80',
    color: 'from-amber-500 to-orange-500'
  },
  {
    name: 'Beauty Theme',
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80',
    color: 'from-red-500 to-pink-500'
  },
  {
    name: 'Jewelry Theme',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
    color: 'from-yellow-500 to-amber-500'
  },
  {
    name: 'Sports Theme',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    name: 'Kids Theme',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
    color: 'from-violet-500 to-purple-500'
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
            Choose Your Perfect{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Template
            </span>
          </h2>
          <p className="text-[#8d8d8d] mt-4">
            Explore our professionally designed templates and find the perfect match for your online store
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Template Image */}
              <div className="relative h-80 overflow-hidden bg-[#e7e9eb]">
                <ImageWithFallback
                  src={template.image}
                  alt={template.name}
                  className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                />
                {/* Preview Button Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <button className="bg-white text-[#0025cc] px-6 py-3 rounded-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-all hover:bg-[#0025cc] hover:text-white">
                    Preview Template
                  </button>
                </div>
              </div>

              {/* Template Info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-[#0c0528] group-hover:text-[#0025cc] transition-colors text-center">
                  {template.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
