'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, ChevronUp } from 'lucide-react';

const DEFAULT_PRICING_URL = 'https://www.dukanest.com/pricing';

/**
 * Sticky "Create your own store" CTA and scroll-to-top button for demo storefronts.
 * Only renders when current tenant has data.is_demo (or isDemo) and user is on storefront (not dashboard/account).
 */
export default function DemoStorefrontExtras() {
  const pathname = usePathname();
  const [isDemo, setIsDemo] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/tenant/current')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data?.tenant) return;
        const tenant = data.tenant as { data?: { is_demo?: boolean; isDemo?: boolean } };
        const demo =
          tenant.data?.is_demo === true || tenant.data?.isDemo === true;
        setIsDemo(demo);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isStorefront =
    pathname &&
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/account') &&
    !pathname.startsWith('/customer-login') &&
    !pathname.startsWith('/customer-register');

  if (!isDemo || !isStorefront) return null;

  return (
    <>
      {/* Sticky side CTA - narrow pill so it doesn't block content */}
      <Link
        href={DEFAULT_PRICING_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Create your own store"
        className="fixed right-0 top-1/2 z-[45] -translate-y-1/2 w-12 py-3 flex items-center justify-center bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white rounded-l-lg shadow-lg hover:w-14 transition-all duration-200"
        aria-label="Create your own store"
      >
        <Store className="w-5 h-5 shrink-0" aria-hidden />
      </Link>

      {/* Scroll to top - bottom of page, left of sticky CTA so both are visible */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-16 z-[45] p-2.5 rounded-full bg-[#0025cc] text-white shadow-lg hover:bg-[#001a99] focus:outline-none focus:ring-2 focus:ring-[#0025cc] focus:ring-offset-2 transition-colors"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
