'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight } from 'lucide-react';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function RevenueCalculator() {
  const [productsSold, setProductsSold] = useState(50);
  const [avgOrderValue, setAvgOrderValue] = useState(2000);
  const sectionRef = useRef<HTMLElement>(null);

  const revenue = productsSold * avgOrderValue;

  useGSAP(
    () => {
      gsap.from('.calc-panel', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-[#0c0528] md:text-5xl">
            How much could you earn?
          </h2>
          <p className="mt-4 text-lg text-[#8d8d8d]">
            Estimate your monthly revenue with a simple calculator.
          </p>
        </div>

        <div className="calc-panel rounded-3xl border border-[#0B33B7]/10 bg-gradient-to-br from-[#f6faff] to-white p-8 shadow-[0_24px_60px_-24px_rgba(11,51,183,0.15)] md:p-10">
          <div className="space-y-8">
            <div>
              <label htmlFor="products-sold" className="mb-3 block text-sm font-medium text-[#0c0528]">
                Products sold monthly: <span className="text-[#0B33B7]">{productsSold}</span>
              </label>
              <input
                id="products-sold"
                type="range"
                min={5}
                max={500}
                step={5}
                value={productsSold}
                onChange={(e) => setProductsSold(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#0B33B7]/20 accent-[#0B33B7]"
              />
            </div>

            <div>
              <label htmlFor="avg-order" className="mb-3 block text-sm font-medium text-[#0c0528]">
                Average order value (Ksh): <span className="text-[#0B33B7]">{avgOrderValue.toLocaleString()}</span>
              </label>
              <input
                id="avg-order"
                type="range"
                min={500}
                max={50000}
                step={500}
                value={avgOrderValue}
                onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#0B33B7]/20 accent-[#0B33B7]"
              />
            </div>

            <div className="rounded-2xl bg-white px-6 py-8 text-center shadow-inner">
              <p className="text-sm font-medium uppercase tracking-wider text-[#8d8d8d]">
                Estimated monthly revenue
              </p>
              <p className="mt-2 text-5xl font-bold text-[#0B33B7] md:text-6xl">
                Ksh {revenue.toLocaleString('en-KE')}
              </p>
              <p className="mt-2 text-sm text-[#8d8d8d]">
                {productsSold} orders &times; Ksh {avgOrderValue.toLocaleString()}
              </p>
            </div>

            <Link
              href="/register"
              onClick={() =>
                trackMetaPixelEvent('Lead', {
                  content_name: 'Start Selling Today',
                  content_category: 'revenue_calculator',
                })
              }
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0B33B7] to-[#082a94] px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Start Selling Today
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
