'use client';

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Palette, Package, CreditCard, ShoppingBag, ArrowRight, ArrowDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const steps = [
  { icon: Palette, title: 'Choose a theme', color: 'from-violet-500 to-purple-600' },
  { icon: Package, title: 'Add products', color: 'from-orange-500 to-amber-500' },
  { icon: CreditCard, title: 'Accept payments', color: 'from-emerald-500 to-teal-500' },
  { icon: ShoppingBag, title: 'Start receiving orders', color: 'from-[#0B33B7] to-[#082a94]' },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from('.how-step', {
        y: 40,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', once: true },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-[#0c0528] md:text-5xl">
            From Zero To Selling In 4 Easy Steps
          </h2>
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 md:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex w-full flex-col items-center">
                <div className="how-step flex w-full max-w-lg items-center gap-5 rounded-3xl border border-[#eaeaea] bg-white p-6 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-md`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex flex-1 items-center gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B33B7] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-semibold text-[#0c0528]">{step.title}</h3>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowDown className="how-step my-1 h-6 w-6 text-[#0B33B7]/40" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0B33B7] to-[#082a94] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
