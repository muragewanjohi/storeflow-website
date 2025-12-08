/**
 * Marketing Landing Page Wrapper
 * 
 * Client component wrapper for lazy-loading the marketing landing page
 * This is needed because Next.js 15 doesn't allow `ssr: false` in Server Components
 */

'use client';

import dynamic from 'next/dynamic';

const MarketingLandingPage = dynamic(() => import('./landing-page'), {
  ssr: false, // Disable SSR to prevent hydration issues
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
});

export default function MarketingLandingPageWrapper() {
  return <MarketingLandingPage />;
}

