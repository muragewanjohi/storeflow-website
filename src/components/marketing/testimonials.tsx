import Image from 'next/image';
import Link from 'next/link';
import { Star, Quote, ArrowRight } from 'lucide-react';

const testimonials = [
  {
    name: 'Wanjiku Kamau',
    role: 'Boutique Owner',
    company: 'Nairobi Fashion Hub',
    image: 'https://images.unsplash.com/photo-1668752741330-8adc5cef7485?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwd29tYW4lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY1OTA5ODAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 5,
    painPoint: 'Managing orders via phone calls & WhatsApp',
    text: 'Before DukaNest, I was juggling orders through phone calls and WhatsApp messages &mdash; things kept falling through the cracks. Now every order is tracked automatically in my dashboard. I can see what&rsquo;s pending, what&rsquo;s been delivered, and the analytics show me exactly which products are selling best. Scaling my business finally feels manageable.',
    highlight: 'From WhatsApp chaos to organized order management',
  },
  {
    name: 'Amani Otieno',
    role: 'Grocery Store Manager',
    company: 'Fresh Market Mombasa',
    image: 'https://images.unsplash.com/photo-1563132337-f159f484226c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwYnVzaW5lc3N3b21hbnxlbnwxfHx8fDE3NjU5NjYwNjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 5,
    painPoint: 'No visibility on stock levels',
    text: 'I used to run out of fast-selling items without realizing it until a customer asked. With DukaNest, I set up low-stock notifications and I get alerted before anything runs out. I also configured delivery zones across Mombasa so my customers know the delivery cost upfront &mdash; no more back-and-forth on WhatsApp about delivery fees.',
    highlight: 'Low-stock alerts + managed delivery zones',
  },
  {
    name: 'Kofi Mwangi',
    role: 'Electronics Retailer',
    company: 'Tech Hub Kenya',
    image: 'https://images.unsplash.com/photo-1616804827035-f4aa814c14ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2NTk2NjA2MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 5,
    painPoint: 'Website development was too expensive',
    text: 'I wanted a professional website for years but every developer I spoke to quoted Ksh 50,000 or more, plus monthly maintenance fees. With DukaNest I started at just Ksh 1,000 a month and got a fully customized online store that runs on its own &mdash; no developer needed for updates or maintenance. It was the most affordable decision I ever made for my business.',
    highlight: 'Professional website from just Ksh 1,000/month',
  }
];

// Payment & trust logos
const trustLogos = [
  { name: 'M-Pesa', display: 'M-Pesa' },
  { name: 'Visa', display: 'Visa' },
  { name: 'Mastercard', display: 'Mastercard' },
  { name: 'Pesapal', display: 'Pesapal' },
];

export function Testimonials() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Real Results</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            Store Owners Who{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Made the Switch
            </span>
          </h2>
          <p className="text-[#8d8d8d] mt-4 text-lg">
            See how businesses across Kenya are growing with DukaNest
          </p>
        </div>

        {/* Testimonials Grid */}
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

              {/* Solution Highlight */}
              <div className="inline-flex items-center bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                ✓ {testimonial.highlight}
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-[#555] leading-relaxed mb-6 relative z-10" dangerouslySetInnerHTML={{ __html: `&ldquo;${testimonial.text}&rdquo;` }} />

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

        {/* Trusted Payments Bar */}
        <div className="mt-16 pt-12 border-t border-[#0025cc]/10">
          <p className="text-center text-sm text-[#8d8d8d] mb-6 uppercase tracking-wider font-medium">Trusted Payment Methods</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {trustLogos.map((logo, index) => (
              <div key={index} className="text-[#8d8d8d] font-bold text-xl opacity-50 hover:opacity-100 transition-opacity">
                {logo.display}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link 
            href="/register" 
            className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex items-center gap-2 font-semibold"
          >
            Join These Store Owners
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
