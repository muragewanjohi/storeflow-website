import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import ProgressBarProvider from "@/components/providers/progress-bar-provider";
import { CurrencyProvider } from "@/lib/currency/currency-context";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import ThemeStylesServer from "@/components/storefront/theme-styles-server";

export const metadata: Metadata = {
  title: "DukaNest - Multi-Tenant Ecommerce Platform",
  description: "Start Your Store. Grow Your Business. It's That Simple.",
  manifest: '/favicon_io/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon_io/favicon.ico', sizes: 'any' },
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <ThemeStylesServer />
        </Suspense>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <CurrencyProvider>
              <ProgressBarProvider>
                {children}
              </ProgressBarProvider>
            </CurrencyProvider>
            <Toaster />
            <SpeedInsights />
            <Analytics />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

