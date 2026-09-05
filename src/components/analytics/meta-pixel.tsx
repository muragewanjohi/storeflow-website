/**
 * Meta Pixel Component
 *
 * Loads Meta (Facebook) Pixel for conversion tracking and audience building.
 * Add to the root layout for site-wide tracking.
 *
 * Set NEXT_PUBLIC_META_PIXEL_ID in your environment for the pixel ID.
 * Default: 1220253003576515 (Dukanest pixel)
 */

'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || '1220253003576515';

export function MetaPixel() {
  const pathname = usePathname();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (!isScriptLoaded) return;

    // Track page view on route change
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'PageView');
      if (process.env.NODE_ENV === 'development') {
        console.log('[Meta Pixel] Page view tracked:', pathname);
      }
    }
  }, [pathname, isScriptLoaded]);

  if (!META_PIXEL_ID) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
        onLoad={() => setIsScriptLoaded(true)}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel requires 1x1 tracking pixel, Next/Image not suitable */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
