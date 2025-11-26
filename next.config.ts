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
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/products/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
      {
        source: '/api/cart/count',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=30',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

