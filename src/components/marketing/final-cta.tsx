'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';

export function FinalCTA() {
  return (
    <section className="py-24" style={{ background: 'linear-gradient(135deg, #0c0528 0%, #0B33B7 60%, #082a94 100%)' }}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          Stop Renting Customers.
          <br />
          Build Something You Own.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
          Launch your online store today and grow your business with DukaNest.
        </p>
        <Link
          href="/register"
          onClick={() =>
            trackMetaPixelEvent('Lead', {
              content_name: 'Start Free Trial',
              content_category: 'final_cta',
            })
          }
          className="group mt-10 inline-flex items-center gap-2 rounded-2xl bg-white px-10 py-4 text-lg font-semibold text-[#0B33B7] shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
        >
          Start Free Trial
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="mt-4 text-sm text-white/60">No coding required.</p>
      </div>
    </section>
  );
}
