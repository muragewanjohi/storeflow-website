'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Clock, Zap, CreditCard, ShieldCheck } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const stats = [
  { value: '5 min', label: 'To Set Up Your Store', icon: Clock },
  { value: '0', label: 'Coding Required', icon: Zap },
  { value: 'Online', label: 'Payments Ready', icon: CreditCard },
  { value: '99.9%', label: 'Uptime Guarantee', icon: ShieldCheck },
];

export function Stats() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from('.stat-item', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
        },
      });

      gsap.from('.stat-quote', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.4,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-16"
      style={{ background: 'linear-gradient(135deg, #0025cc 0%, #001a99 100%)' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div key={stat.label} className="stat-item space-y-2">
                <IconComponent className="w-6 h-6 mx-auto text-white/70" />
                <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-sm md:text-base text-white/80">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="stat-quote mt-12 pt-8 border-t border-white/20 max-w-3xl mx-auto text-center">
          <p className="text-white/90 text-lg italic leading-relaxed">
            &ldquo;I wanted a professional website for years but every developer quoted Ksh 50,000+. With DukaNest I got a fully customized online store from just Ksh 1,000/month.&rdquo;
          </p>
          <p className="text-white/60 text-sm mt-3">&mdash; Kofi M., Electronics Retailer, Nairobi</p>
        </div>
      </div>
    </section>
  );
}
