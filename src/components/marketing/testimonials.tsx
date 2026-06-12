'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';

const stories = [
  {
    company: 'Smart Hub Electronics',
    before: 'WhatsApp orders only',
    after: ['12,458 visitors', '250 orders', 'Ksh 250,000 revenue'],
    image: 'https://images.unsplash.com/photo-1616804827035-f4aa814c14ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
    name: 'Kofi Mwangi',
  },
  {
    company: 'Wedding Gowns',
    before: 'Instagram only',
    after: ['Professional website', 'Repeat customers', 'Inventory tracking'],
    image: 'https://images.unsplash.com/photo-1668752741330-8adc5cef7485?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
    name: 'Wanjiku Kamau',
  },
  {
    company: 'Fashion Hub',
    before: 'Facebook Marketplace',
    after: ['More sales', 'Easier management', 'Better branding'],
    image: 'https://images.unsplash.com/photo-1563132337-f159f484226c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
    name: 'Amani Otieno',
  },
];

export function Testimonials() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-[#0c0528] md:text-5xl">
            Store Owners Who Made The Switch
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {stories.map((story) => (
            <article
              key={story.company}
              className="testimonial-card group rounded-3xl border border-[#eaeaea] bg-[#f8f9fb] p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-[#0B33B7]/20">
                  <Image src={story.image} alt={story.name} fill className="object-cover" sizes="56px" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0c0528]">{story.company}</h3>
                  <p className="text-sm text-[#8d8d8d]">{story.name}</p>
                </div>
              </div>

              <div className="mb-1 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8d8d8d]">Before</p>
                  <p className="mt-1 text-[#555]">{story.before}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0B33B7]">After</p>
                  <ul className="mt-2 space-y-1.5">
                    {story.after.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm font-medium text-[#0c0528]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0B33B7] to-[#082a94] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            Join These Store Owners
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
