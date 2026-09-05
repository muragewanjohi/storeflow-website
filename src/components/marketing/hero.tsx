'use client';

import Link from 'next/link';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';
import { HeroMockups } from './hero-mockups';

const bullets = [
  'Own Domain',
  'M-Pesa Payments',
  'Expense & COGS Tracking',
  'Mobile App Included',
];

export function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden pt-20"
      style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f6faff 50%, #eef4ff 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-[#0B33B7]/8 blur-[100px]" />
        <div className="absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#082a94]/10 blur-[80px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid w-full items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8 lg:sticky lg:top-24 lg:py-4">
            <h1 className="text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-[#0c0528]">
              <span className="block">Own Your Online Store.</span>
              <span className="block bg-gradient-to-r from-[#0B33B7] to-[#082a94] bg-clip-text text-transparent">
                Grow Your Business.
              </span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-[#555]">
              Sell products, accept payments, track profits, and manage everything from one place.
            </p>

            <ul className="space-y-3">
              {bullets.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[#0c0528]">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0B33B7]" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-4">
              <Link
                href="/register"
                onClick={() =>
                  trackMetaPixelEvent('Lead', {
                    content_name: 'Create your own store - Free for 30 days',
                    content_category: 'hero',
                  })
                }
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0B33B7] to-[#082a94] px-8 py-4 text-lg font-semibold text-white shadow-[0_20px_40px_-12px_rgba(11,51,183,0.45)] sm:w-fit"
              >
                Create your own store &mdash; Free for 30 days
                <ArrowRight className="h-5 w-5" />
              </Link>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  onClick={() =>
                    trackMetaPixelEvent('Lead', {
                      content_name: 'Start Free Trial',
                      content_category: 'hero',
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0B33B7]/25 bg-white px-8 py-3.5 font-semibold text-[#0B33B7]"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/demo-stores"
                  onClick={() =>
                    trackMetaPixelEvent('Lead', {
                      content_name: 'Watch Demo',
                      content_category: 'hero',
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0B33B7]/20 bg-white px-8 py-3.5 font-semibold text-[#0B33B7]"
                >
                  <Play className="h-5 w-5" />
                  Watch Demo
                </Link>
              </div>
            </div>
          </div>

          <HeroMockups />
        </div>
      </div>
    </section>
  );
}
