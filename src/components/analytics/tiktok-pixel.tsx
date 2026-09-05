'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const TIKTOK_PIXEL_ID =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || 'D6N7BVBC77UE81ODK9A0';

export function TikTokPixel() {
  const pathname = usePathname();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (!isScriptLoaded) return;
    if (typeof window === 'undefined' || !window.ttq) return;

    window.ttq.page();
    if (process.env.NODE_ENV === 'development') {
      console.log('[TikTok Pixel] Page view tracked:', pathname);
    }
  }, [pathname, isScriptLoaded]);

  if (!TIKTOK_PIXEL_ID) {
    return null;
  }

  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function (w, d, t) {
            w.TiktokAnalyticsObject = t;
            var ttq = (w[t] = w[t] || []);
            ttq.methods = [
              "page",
              "track",
              "identify",
              "instances",
              "debug",
              "on",
              "off",
              "once",
              "ready",
              "alias",
              "group",
              "enableCookie",
              "disableCookie",
              "holdConsent",
              "revokeConsent",
              "grantConsent"
            ];
            ttq.setAndDefer = function (target, method) {
              target[method] = function () {
                target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
              };
            };
            for (var i = 0; i < ttq.methods.length; i++) {
              ttq.setAndDefer(ttq, ttq.methods[i]);
            }
            ttq.load = function (pixelId, options) {
              var src = "https://analytics.tiktok.com/i18n/pixel/events.js";
              ttq._i = ttq._i || {};
              ttq._i[pixelId] = [];
              ttq._i[pixelId]._u = src;
              ttq._t = ttq._t || {};
              ttq._t[pixelId] = +new Date();
              ttq._o = ttq._o || {};
              ttq._o[pixelId] = options || {};
              var script = d.createElement("script");
              script.type = "text/javascript";
              script.async = true;
              script.src = src + "?sdkid=" + pixelId + "&lib=" + t;
              var first = d.getElementsByTagName("script")[0];
              first.parentNode.insertBefore(script, first);
            };
            ttq.load("${TIKTOK_PIXEL_ID}");
            ttq.page();
          })(window, document, "ttq");
        `,
      }}
      onLoad={() => setIsScriptLoaded(true)}
    />
  );
}
