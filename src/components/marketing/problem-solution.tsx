'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { X, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const problems = [
  'Lost orders',
  'No customer database',
  'Hard to track profits',
  'No professional website',
  'No inventory tracking',
];

const solutions = [
  'Online store',
  'Inventory management',
  'Payments',
  'Delivery',
  'Expense tracking',
  'Analytics',
];

export function ProblemSolution() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from('.problem-col', {
        x: -40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      });
      gsap.from('.solution-col', {
        x: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="about" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-16 text-center text-4xl font-bold tracking-tight text-[#0c0528] md:text-5xl">
          Still Selling Only Through WhatsApp?
        </h2>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="problem-col rounded-3xl border border-red-100 bg-red-50/50 p-8 md:p-10">
            <h3 className="mb-6 text-xl font-semibold text-[#0c0528]">The struggle</h3>
            <ul className="space-y-4">
              {problems.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[#555]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <X className="h-4 w-4 text-red-500" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="solution-col rounded-3xl border border-[#0B33B7]/15 bg-gradient-to-br from-[#f6faff] to-white p-8 shadow-[0_24px_60px_-24px_rgba(11,51,183,0.2)] md:p-10">
            <h3 className="mb-6 text-xl font-semibold text-[#0B33B7]">DukaNest solves this</h3>
            <ul className="space-y-4">
              {solutions.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[#0c0528]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
