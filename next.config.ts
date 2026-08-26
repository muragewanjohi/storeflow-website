import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Ensure .env* are loaded relative to this app (helps when cwd/env resolution differs)
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  // Avoid monorepo root inference issues (multiple lockfiles)
  outputFileTracingRoot: __dirname,
  // Enable React compiler for better performance (if available)
  // reactCompiler: true,
  
  // ESLint configuration
  eslint: {
    // ESLint will run during build and show warnings/errors
    // Set to true if you want to ignore ESLint errors during builds (not recommended)
    ignoreDuringBuilds: false,
    // Specify directories to lint (defaults to all)
    dirs: ['src', 'app'],
  },
  
  // Optimize images - critical for performance (Amazon/Shopify use CDN + optimization)
  images: {
    // Next.js 16+ will require explicit qualities when using the quality prop
    qualities: [75, 90, 100],
    remotePatterns: [
      // Local dev: onboarding placeholder and other same-origin URLs stored as absolute (NEXT_PUBLIC_APP_URL)
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/**',
      },
      // Storefront/domain-hosted assets (tenant subdomains and CDN paths).
      // Use ** so nested hosts match (e.g. shop.dev.dukanest.com — single * only matches shop.dukanest.com).
      {
        protocol: 'https',
        hostname: 'dukanest.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.dukanest.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dukanest.co.ke',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.dukanest.co.ke',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
      // Vercel preview deployments (placeholder/media URLs sometimes stored with VERCEL_URL)
      {
        protocol: 'https',
        hostname: '**.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storeflow.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.storeflow.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
    // Allow any Supabase storage URL
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Image optimization settings
    formats: ['image/avif', 'image/webp'], // Modern formats for better compression
    minimumCacheTTL: 60, // Cache optimized images for 60 seconds
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive sizes
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
  },
  
  // Enable compression
  compress: true,
  
  // Experimental features for better performance
  experimental: {
    // Optimize package imports (tree shaking)
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },
  
  // Server external packages - prevents bundling issues with packages that need to be external
  // Required for PDFKit to work in serverless environments (Vercel)
  serverExternalPackages: ['pdfkit'],
  
  // Headers for better caching and CDN optimization
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https://pay.pesapal.com https://cybqa.pesapal.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://pay.pesapal.com https://cybqa.pesapal.com",
          },
        ],
      },
      // API routes - Product endpoints
      {
        source: '/api/products/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=60',
          },
        ],
      },
      // API routes - Cart endpoints
      {
        source: '/api/cart/count',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=30',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=10',
          },
        ],
      },
      {
        source: '/api/cart/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      // API routes - Orders (private, no cache)
      {
        source: '/api/orders/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      // API routes - Analytics (cache for 5 minutes)
      {
        source: '/api/analytics/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      // Static assets - Long cache. PRODUCTION ONLY: Next.js content-hashes
      // these filenames on a real build, so an immutable 1-year cache is
      // correct there. In dev, route-level chunk filenames under
      // /_next/static/chunks/app/** are NOT content-hashed (they're stable
      // per-route names) — an immutable header on them means a browser tab
      // that ever fetches a route once will keep serving that exact JS
      // forever, silently ignoring every subsequent source change and
      // dev-server recompile, no matter how many times the page is
      // reloaded. Found live, twice, each time as a long, misleading
      // "my fix isn't taking effect" debugging session before the real
      // cause (this header, not the code) was identified via `curl -sD-`.
      {
        source: '/_next/static/:path*',
        headers:
          process.env.NODE_ENV === 'production'
            ? [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
            : [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      // Images - Cache for 1 year in production (Next.js Image handles
      // optimization); same dev-mode staleness risk as above otherwise.
      {
        source: '/images/:path*',
        headers:
          process.env.NODE_ENV === 'production'
            ? [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
            : [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      // Fonts - Long cache in production; same dev-mode staleness risk as above otherwise.
      {
        source: '/fonts/:path*',
        headers:
          process.env.NODE_ENV === 'production'
            ? [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
            : [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;

