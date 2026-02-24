'use client';

import { Clock, Zap, CreditCard, ShieldCheck } from 'lucide-react';

const stats = [
  { value: '5 min', label: 'To Set Up Your Store', icon: Clock },
  { value: '0', label: 'Coding Required', icon: Zap },
  { value: 'Online', label: 'Payments Ready', icon: CreditCard },
  { value: '99.9%', label: 'Uptime Guarantee', icon: ShieldCheck },
];

export function Stats() {
  return (
    <section className="py-12 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="space-y-2">
                <IconComponent className="w-6 h-6 mx-auto text-white/70" />
                <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
                <div className="text-sm md:text-base text-white/80">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Inline Social Proof Quote */}
        <div className="mt-10 pt-8 border-t border-white/20 max-w-3xl mx-auto text-center">
          <p className="text-white/90 text-lg italic leading-relaxed">
            &ldquo;I wanted a professional website for years but every developer quoted Ksh 50,000+. With DukaNest I got a fully customized online store from just Ksh 1,000/month.&rdquo;
          </p>
          <p className="text-white/60 text-sm mt-3">&mdash; Kofi M., Electronics Retailer, Nairobi</p>
        </div>
      </div>
    </section>
  );
}
