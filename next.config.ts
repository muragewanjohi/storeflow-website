import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React compiler for better performance (if available)
  // reactCompiler: true,
  
  // Optimize images - critical for performance (Amazon/Shopify use CDN + optimization)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
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
  
  // Headers for better caching and CDN optimization
  async headers() {
    return [
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
      // Static assets - Long cache
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images - Cache for 1 year (Next.js Image handles optimization)
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Fonts - Long cache
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

