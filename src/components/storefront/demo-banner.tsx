'use client';

import Link from 'next/link';

interface DemoBannerProps {
  /** URL for "Create your own store" CTA. Defaults to marketing pricing page. */
  registerUrl?: string;
}

const DEFAULT_PRICING_URL = 'https://www.dukanest.com/pricing';

/**
 * Banner shown on demo storefronts to guide visitors to create their own store.
 * Renders when tenant.data.is_demo (or isDemo) is true.
 */
export default function DemoBanner({ registerUrl = DEFAULT_PRICING_URL }: Readonly<DemoBannerProps>) {
  return (
    <div
      className="relative z-40 w-full bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white py-2.5 px-4 text-center text-sm shadow-md"
      role="banner"
      aria-label="Demo store notice"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <span className="font-medium">
          You&apos;re viewing a demo store
        </span>
        <span className="hidden sm:inline text-white/80">—</span>
        <Link
          href={registerUrl}
          target={registerUrl.startsWith('http') ? '_blank' : undefined}
          rel={registerUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1.5 font-semibold text-white underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#001a99] rounded"
        >
          Create your own store
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
