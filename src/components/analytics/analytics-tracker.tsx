/**
 * Analytics Tracker Component
 * 
 * Client-side component that automatically tracks page views and events
 * Should be included in the storefront layout
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initializeSession, trackPageView } from '@/lib/analytics/tracking';

let pageViewStartTime: number | null = null;

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize session on mount
    initializeSession();
  }, []);

  useEffect(() => {
    // Track page view on route change
    const trackCurrentPage = async () => {
      // Calculate time on previous page
      let timeOnPage = 0;
      if (pageViewStartTime) {
        timeOnPage = Math.floor((Date.now() - pageViewStartTime) / 1000);
      }

      // Extract product/category IDs from pathname
      let productId: string | undefined;
      let categoryId: string | undefined;

      // Check if this is a product page (/products/[slug] or /[slug])
      const productSlug = pathname.split('/').pop();
      if (productSlug && pathname.includes('/products/')) {
        // Product ID will be resolved on the server side
        // For now, we'll track the slug
      }

      // Check if this is a category page
      if (pathname.includes('/category/') || pathname.includes('/categories/')) {
        // Category ID will be resolved on the server side
      }

      // Track page view
      await trackPageView({
        pagePath: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
        pageTitle: document.title,
        productId,
        categoryId,
        timeOnPage,
      });

      // Reset timer for new page
      pageViewStartTime = Date.now();
    };

    trackCurrentPage();

    // Cleanup: track time on page when component unmounts
    return () => {
      if (pageViewStartTime) {
        const timeOnPage = Math.floor((Date.now() - pageViewStartTime) / 1000);
        // Send final page view with time on page
        trackPageView({
          pagePath: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
          pageTitle: document.title,
          timeOnPage,
        });
      }
    };
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}
