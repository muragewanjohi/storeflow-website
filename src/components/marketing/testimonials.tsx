import Image from 'next/image';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Wanjiku Kamau',
    role: 'Boutique Owner',
    company: 'Nairobi Fashion Hub',
    image: 'https://images.unsplash.com/photo-1668752741330-8adc5cef7485?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwd29tYW4lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY1OTA5ODAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 5,
    text: 'DukaNest transformed my business! Setting up my online store was incredibly easy, and I was selling within hours. The templates are beautiful and the dashboard makes managing orders a breeze.'
  },
  {
    name: 'Kofi Mwangi',
    role: 'Electronics Retailer',
    company: 'Tech Hub Kenya',
    image: 'https://images.unsplash.com/photo-1616804827035-f4aa814c14ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2NTk2NjA2MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 5,
    text: 'The scalability of DukaNest is impressive. Started with the Basic plan and upgraded to Premium as my business grew. The unlimited products feature is exactly what I needed for my expanding inventory.'
  },
  {
    name: 'Amani Otieno',
    role: 'Grocery Store Manager',
    company: 'Fresh Market Mombasa',
    image: 'https://images.unsplash.com/photo-1563132337-f159f484226c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwYnVzaW5lc3N3b21hbnxlbnwxfHx8fDE3NjU5NjYwNjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 5,
    text: 'Customer support is outstanding! Available 24/7 and always helpful. The secure payment processing gives my customers confidence, and the multi-currency support helped me reach international buyers.'
  }
];

export function Testimonials() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Testimonials</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            What Our{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Customers
            </span>{' '}
            Are Saying
          </h2>
          <p className="text-[#8d8d8d] mt-4">
            Join thousands of successful store owners who trust DukaNest to power their e-commerce business
          </p>
        </div>

        {/* Testimonials Grid - Single Row */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden"
            >
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 text-blue-100">
                <Quote className="w-12 h-12" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-[#8d8d8d] leading-relaxed mb-6 relative z-10">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Customer Info */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-blue-100">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-[#0c0528]">{testimonial.name}</h4>
                  <p className="text-sm text-[#8d8d8d]">{testimonial.role}</p>
                  <p className="text-xs text-[#0025cc]">{testimonial.company}</p>
                </div>
              </div>

              {/* Hover effect gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0025cc] to-[#001a99] opacity-0 group-hover:opacity-5 transition-opacity"></div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        {/* <div className="grid md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
          <div className="text-center">
            <div className="text-4xl font-bold text-[#0025cc] mb-2">10,000+</div>
            <div className="text-[#8d8d8d]">Active Stores</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-[#0025cc] mb-2">98%</div>
            <div className="text-[#8d8d8d]">Customer Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-[#0025cc] mb-2">$50M+</div>
            <div className="text-[#8d8d8d]">Sales Processed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-[#0025cc] mb-2">24/7</div>
            <div className="text-[#8d8d8d]">Support Available</div>
          </div>
        </div> */}
      </div>
    </section>
  );
}
