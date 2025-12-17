'use client';

import { ImageWithFallback } from './image-with-fallback';

const testimonials = [
  {
    name: 'Williamson Johnson',
    company: 'Daraz',
    content: 'I was able to learn a large amount in a short amount of time. The practical nature helped me understand what we were trying to do, and how to achieve it.',
  },
  {
    name: 'Austin Hull',
    company: 'eBay',
    content: 'I was able to learn a large amount in a short amount of time. The practical nature helped me understand what we were trying to do, and how to achieve it.',
  },
  {
    name: 'Albert Flores',
    company: 'EG Commerce',
    content: 'I was able to learn a large amount in a short amount of time. The practical nature helped me understand what we were trying to do, and how to achieve it.',
  },
];

export function Testimonials() {
  const avatars = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Customer Feedback</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Credibly actualize interoperable technology without prospective processes. Conveniently mesh tally parallel task cross-media.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-6 rounded-lg bg-background border hover:shadow-lg transition-all duration-300"
            >
              <p className="text-muted-foreground mb-6 italic">&quot;{testimonial.content}&quot;</p>
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={avatars[index]}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
