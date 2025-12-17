'use client';

import { ImageWithFallback } from './image-with-fallback';

const whyChooseUs = [
  {
    title: 'Start Online Business',
    description: 'Launch your online store quickly with our easy-to-use platform. No technical knowledge required.',
  },
  {
    title: 'Move your Business Online',
    description: 'Take your existing business online seamlessly. Import products and start selling in no time.',
  },
  {
    title: 'Switch to our Platform',
    description: 'Migrate from other platforms easily. We provide tools and support to make the transition smooth.',
  },
];

export function WhyChooseUs() {
  const images = [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', // Start Online Business
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', // Move Business Online
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80', // Switch Platform
  ];

  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose us?</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
            Everything you need to succeed in ecommerce, all in one place
          </p>
          <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto">
            Join thousands of successful businesses that trust DukaNest to power their online stores
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {whyChooseUs.map((item, index) => (
            <div key={index} className="p-6 rounded-lg bg-background border hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="relative h-48 rounded-lg overflow-hidden mb-4 -mx-2 -mt-2">
                <ImageWithFallback
                  src={images[index]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
