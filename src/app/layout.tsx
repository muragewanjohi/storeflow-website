import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

