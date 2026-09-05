'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  Smartphone,
  BarChart3,
  Wallet,
  Truck,
  Globe,
  MessageCircle,
  Package,
  Receipt,
} from 'lucide-react';
import { PlayStoreBadge } from './play-store-badge';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const features = [
  { icon: Wallet, title: 'M-Pesa Payments', description: 'Accept payments easily.' },
  { icon: Truck, title: 'Delivery Integration', description: 'Set zones and delivery fees.' },
  { icon: Receipt, title: 'Expense Tracking', description: 'Know your profits.' },
  { icon: Globe, title: 'Own Domain', description: 'Share your business professionally.' },
  { icon: Smartphone, title: 'Mobile App', description: 'Manage from anywhere.' },
  { icon: BarChart3, title: 'Analytics', description: 'Understand performance.' },
  { icon: MessageCircle, title: 'WhatsApp Orders', description: 'Receive orders easily.' },
  { icon: Package, title: 'Inventory Management', description: 'Track stock automatically.' },
];

export function BuiltForKenya() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from('.kenya-card', {
        y: 28,
        duration: 0.7,
        stagger: 0.06,
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
    <section
      ref={sectionRef}
      id="mobile-app"
      className="py-24 text-white"
      style={{ background: 'linear-gradient(135deg, #0B33B7 0%, #082a94 50%, #0c0528 100%)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Built For Kenyan Businesses 🇰🇪
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Payments, delivery, analytics, and more — built for how you sell.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="kenya-card rounded-3xl border border-white/20 bg-white/15 p-6 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/85">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <PlayStoreBadge variant="dark" size="lg" />
          <p className="text-sm text-white/75">Free on Google Play &bull; Works with your web store</p>
        </div>
      </div>
    </section>
  );
}
