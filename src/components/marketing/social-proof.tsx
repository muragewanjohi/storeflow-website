'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { AnimatedCounter } from './animated-counter';
import { BRAND } from '@/lib/marketing/constants';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const stats = [
  { label: 'Orders Processed', value: 250, suffix: '+' },
  { label: 'Monthly Visitors', value: 12458, suffix: '+' },
  { label: 'Products Sold', value: 1200, suffix: '+' },
  { label: 'Uptime', value: 99.9, suffix: '%', decimals: 1 },
];

const businessLogos = ['M-Pesa', 'Pesapal', 'Tumizi'];

export function SocialProof() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from('.social-stat', {
        y: 32,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 85%',
          once: true,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="py-20" style={{ backgroundColor: BRAND.sectionGray }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-12 text-center text-lg font-medium text-[#0c0528]">
          Trusted by growing businesses across Kenya
        </p>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="social-stat text-center">
              <div className="text-3xl font-bold text-[#0B33B7] md:text-4xl">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals ?? 0}
                />
              </div>
              <p className="mt-2 text-sm text-[#8d8d8d] md:text-base">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border-t border-[#0B33B7]/10 pt-12">
          {businessLogos.map((logo) => (
            <span
              key={logo}
              className="text-xl font-bold tracking-wide text-[#8d8d8d]/70 transition-colors hover:text-[#0B33B7]"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
