import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { CurrencyProvider } from "@/lib/currency/currency-context";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "StoreFlow - Multi-Tenant Ecommerce Platform",
  description: "Start Your Store. Grow Your Business. It's That Simple.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <CurrencyProvider>
              {children}
            </CurrencyProvider>
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

