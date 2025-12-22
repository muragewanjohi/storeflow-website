/**
 * Google Analytics Component
 * 
 * Loads Google Analytics 4 (GA4) script and initializes tracking
 * Should be added to the root layout or specific pages
 */

'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics/google-analytics';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Google Analytics] NEXT_PUBLIC_GA_MEASUREMENT_ID is not set. Tracking is disabled.');
      }
      return;
    }

    // Wait for script to load before tracking
    if (!isScriptLoaded) return;

    // Small delay to ensure gtag is fully initialized
    const timer = setTimeout(() => {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      trackPageView(url);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Google Analytics] Page view tracked:', url);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams, isScriptLoaded]);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={() => {
          setIsScriptLoaded(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('[Google Analytics] Script loaded successfully');
          }
        }}
        onError={() => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Google Analytics] Failed to load script');
          }
        }}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

