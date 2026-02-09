'use client';

import { Store, Package, CreditCard, HeadphonesIcon } from 'lucide-react';

const stats = [
  { value: '50+', label: 'Stores Created', icon: Store },
  { value: '500+', label: 'Products Listed', icon: Package },
  { value: '99.9%', label: 'Uptime Guarantee', icon: CreditCard },
  { value: '24/7', label: 'Support Available', icon: HeadphonesIcon },
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
      </div>
    </section>
  );
}
