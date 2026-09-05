'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function Newsletter() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Still Selling Products Online Without Your Own Website?
        </h2>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Your customers are ready to buy. Give them a professional store where they can see products, prices, and delivery fees &mdash; and place orders without messaging you first, whether they find you on WhatsApp, Instagram, Facebook, Jiji, or Jumia.
        </p>

        {/* Trust Signals */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80 mb-10">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-300" />
            Free for 14 days
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-300" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-300" />
            Set up in 5 minutes
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-300" />
            From Ksh 1,000/mo
          </span>
        </div>

        {/* Primary CTA */}
        <Link 
          href="/register" 
          className="group bg-white text-[#0025cc] px-10 py-5 rounded-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all inline-flex items-center gap-2 text-lg font-bold"
        >
          Create Your Store Now
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        <p className="text-sm text-white/60 mt-4">
          Join sellers across Kenya who moved from WhatsApp to their own online store
        </p>
      </div>
    </section>
  );
}
