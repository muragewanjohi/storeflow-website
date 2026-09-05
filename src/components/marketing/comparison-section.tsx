'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Check, X } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const rows = [
  { feature: 'Initial Cost', developer: 'Ksh 100k+', dukanest: 'Ksh 1,000/mo', dukanestWins: true },
  { feature: 'Time to Launch', developer: 'Months', dukanest: 'Minutes', dukanestWins: true },
  { feature: 'Maintenance', developer: 'Difficult', dukanest: 'Included', dukanestWins: true },
  { feature: 'Mobile App', developer: 'Extra cost', dukanest: 'Included', dukanestWins: true },
  { feature: 'Payments', developer: 'Extra work', dukanest: 'Built-in', dukanestWins: true },
  { feature: 'Hosting', developer: 'Extra cost', dukanest: 'Included', dukanestWins: true },
];

export function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from('.comparison-row', {
        x: -24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-[#f8f9fb] py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-4xl font-bold tracking-tight text-[#0c0528] md:text-5xl">
          Build Yourself vs Use DukaNest
        </h2>

        <div className="overflow-hidden rounded-3xl border border-[#0B33B7]/10 bg-white shadow-lg">
          <div className="grid grid-cols-3 border-b border-[#eaeaea] bg-[#f8f9fb] px-6 py-4 text-sm font-semibold text-[#0c0528]">
            <span>Feature</span>
            <span className="text-center">Developer</span>
            <span className="text-center text-[#0B33B7]">DukaNest</span>
          </div>

          {rows.map((row) => (
            <div
              key={row.feature}
              className="comparison-row grid grid-cols-3 items-center border-b border-[#eaeaea] px-6 py-5 last:border-0"
            >
              <span className="font-medium text-[#0c0528]">{row.feature}</span>
              <span className="flex items-center justify-center gap-2 text-center text-sm text-[#8d8d8d]">
                <X className="hidden h-4 w-4 shrink-0 text-red-400 sm:block" />
                {row.developer}
              </span>
              <span className="flex items-center justify-center gap-2 text-center text-sm font-medium text-[#0B33B7]">
                <Check className="hidden h-4 w-4 shrink-0 text-emerald-500 sm:block" />
                {row.dukanest}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
