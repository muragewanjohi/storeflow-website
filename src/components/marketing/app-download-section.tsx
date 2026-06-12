'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Smartphone, Bell, BarChart3, Package } from 'lucide-react';
import { PlayStoreBadge } from './play-store-badge';
import { ImageWithFallback } from './image-with-fallback';
import { BRAND, MOBILE_SCREENSHOTS } from '@/lib/marketing/constants';

const HeroScene = dynamic(() => import('./hero-scene').then((m) => m.HeroScene), {
  ssr: false,
});

gsap.registerPlugin(ScrollTrigger, useGSAP);

const appFeatures = [
  { icon: Package, label: 'Manage products on the go' },
  { icon: BarChart3, label: 'Real-time sales analytics' },
  { icon: Bell, label: 'Instant order notifications' },
  { icon: Smartphone, label: 'Built for Kenyan sellers' },
];

export function AppDownloadSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const phonesRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!phonesRef.current) return;

      const phones = phonesRef.current.querySelectorAll('.app-phone');

      gsap.from(phones, {
        y: 80,
        opacity: 0,
        rotateY: -12,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
        },
      });

      gsap.to('.app-phone-home', {
        y: -16,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.app-phone-analytics', {
        y: -24,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.4,
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="mobile-app"
      className="relative overflow-hidden py-24 lg:py-32"
      style={{ background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.blueDark} 50%, ${BRAND.blue} 100%)` }}
    >
      <div className="absolute inset-0 opacity-30">
        <HeroScene />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="text-white">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Now on Google Play
            </span>
            <h2 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              Run your store
              <br />
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                from your pocket
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
              The DukaNest mobile app puts your entire business in your hands. Add products, track orders,
              and grow sales &mdash; wherever you are.
            </p>

            <ul className="mt-8 space-y-4">
              {appFeatures.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-white/90">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <PlayStoreBadge variant="light" size="lg" />
              <p className="text-sm text-white/60">
                Free download &bull; Works with your web store
              </p>
            </div>
          </div>

          <div
            ref={phonesRef}
            className="relative mx-auto flex h-[520px] w-full max-w-[420px] items-center justify-center lg:mx-0 lg:ml-auto lg:max-w-none lg:justify-end"
            style={{ perspective: '1200px' }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-full bg-white/5 blur-3xl" />

            <div className="app-phone app-phone-home absolute left-0 top-8 z-10 w-[min(48%,200px)] -rotate-6 drop-shadow-[0_40px_80px_rgba(0,0,0,0.4)] sm:w-[220px] lg:left-4 lg:w-[240px]">
              <ImageWithFallback
                src={MOBILE_SCREENSHOTS.home}
                alt="DukaNest mobile app home dashboard"
                width={640}
                height={1280}
                className="h-auto w-full rounded-[2rem]"
              />
            </div>

            <div className="app-phone app-phone-analytics absolute right-0 top-0 z-20 w-[min(58%,240px)] rotate-3 drop-shadow-[0_50px_100px_rgba(0,0,0,0.5)] sm:w-[260px] lg:right-0 lg:w-[280px]">
              <ImageWithFallback
                src={MOBILE_SCREENSHOTS.analytics}
                alt="DukaNest mobile app Analytics Center showing profit and loss insights"
                width={640}
                height={1280}
                className="h-auto w-full rounded-[2rem]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
