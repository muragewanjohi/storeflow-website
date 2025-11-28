/**
 * Default Theme Testimonials Section
 * 
 * Customer testimonials with computer/electronics focus
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role?: string;
  company?: string;
  content: string;
  image?: string;
  rating?: number;
}

interface DefaultTestimonialsProps {
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Software Developer',
    company: 'Tech Corp',
    content: 'The laptop I purchased exceeded all my expectations. Fast, reliable, and perfect for my development work. Highly recommend!',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    rating: 5,
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'IT Manager',
    company: 'Innovation Labs',
    content: 'Outstanding quality and excellent customer service. The desktop setup we ordered for our office has been running flawlessly.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    rating: 5,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Graphic Designer',
    company: 'Creative Studio',
    content: 'Amazing selection of monitors and accessories. The 4K display I bought has transformed my workflow completely.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    rating: 5,
  },
];

export default function DefaultTestimonials({ testimonials = defaultTestimonials }: DefaultTestimonialsProps) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-heading, inherit)' }}
          >
            What Our Customers Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Trusted by thousands of satisfied customers worldwide
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Rating */}
                {testimonial.rating && (
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < testimonial.rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Content */}
                <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                  &quot;{testimonial.content}&quot;
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {testimonial.image ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-semibold text-primary">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{testimonial.name}</p>
                    {(testimonial.role || testimonial.company) && (
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                        {testimonial.role && testimonial.company && ' at '}
                        {testimonial.company}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

