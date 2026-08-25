'use client';

/**
 * Theme Track B — live preview pane for the Customize Theme screen.
 * Embeds the public, no-login preview route (DA.30,
 * src/app/theme-preview/[slug]/) in an iframe and pushes DRAFT (unsaved)
 * color/typography state into it via postMessage as the merchant edits —
 * so they see a real render of their actual theme update live, not just a
 * color swatch, before ever hitting Save. See @/lib/themes/
 * live-preview-protocol for the shared message contract.
 */

import { useEffect, useRef, useState } from 'react';
import {
  THEME_LIVE_PREVIEW_READY,
  THEME_LIVE_PREVIEW_UPDATE,
  type ThemeLivePreviewReadyMessage,
} from '@/lib/themes/live-preview-protocol';

interface LiveThemePreviewProps {
  slug: string;
  colors: Record<string, string | undefined>;
  typography: Record<string, string | number | undefined>;
}

export default function LiveThemePreview({ slug, colors, typography }: Readonly<LiveThemePreviewProps>) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [slug]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as ThemeLivePreviewReadyMessage | undefined;
      if (data?.type === THEME_LIVE_PREVIEW_READY) setReady(true);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const cleanColors = Object.fromEntries(
      Object.entries(colors).filter((entry): entry is [string, string] => Boolean(entry[1]))
    );
    const cleanTypography = Object.fromEntries(
      Object.entries(typography).filter((entry): entry is [string, string | number] => Boolean(entry[1]))
    );
    win.postMessage(
      { type: THEME_LIVE_PREVIEW_UPDATE, colors: cleanColors, typography: cleanTypography },
      window.location.origin
    );
  }, [ready, colors, typography]);

  return (
    <div className="sticky top-4 rounded-lg border border-border overflow-hidden bg-background">
      <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40">
        Live preview — reflects your unsaved changes
      </div>
      <iframe
        ref={iframeRef}
        key={slug}
        src={`/theme-preview/${slug}`}
        title="Live theme preview"
        className="w-full"
        style={{ height: '70vh', border: 'none' }}
      />
    </div>
  );
}
