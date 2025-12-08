/**
 * Image Optimization Utilities
 * 
 * Provides utilities for optimizing images from Supabase Storage
 * Uses Supabase Storage transforms and Next.js Image optimization
 * 
 * Day 38: Performance Optimization
 */

/**
 * Generate optimized image URL from Supabase Storage
 * 
 * @param imagePath - Path to image in Supabase Storage
 * @param options - Optimization options
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  imagePath: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
    resize?: 'cover' | 'contain' | 'fill';
  } = {}
): string | null {
  if (!imagePath) return null;

  // If already a full URL, return as-is (Next.js Image will optimize)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Supabase Storage URL pattern
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseStorageBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';

  if (!supabaseUrl) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL not configured');
    return imagePath;
  }

  // Build Supabase Storage URL with transform parameters
  // Supabase Storage supports query parameters for transforms
  const url = new URL(`${supabaseUrl}/storage/v1/object/public/${supabaseStorageBucket}/${imagePath}`);
  
  // Add transform parameters if provided
  if (options.width) {
    url.searchParams.set('width', options.width.toString());
  }
  if (options.height) {
    url.searchParams.set('height', options.height.toString());
  }
  if (options.quality) {
    url.searchParams.set('quality', options.quality.toString());
  }
  if (options.format) {
    url.searchParams.set('format', options.format);
  }
  if (options.resize) {
    url.searchParams.set('resize', options.resize);
  }

  return url.toString();
}

/**
 * Get responsive image sizes for different breakpoints
 */
export function getResponsiveImageSizes(
  imagePath: string | null | undefined,
  sizes: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    large?: number;
  } = {}
): {
  src: string | null;
  srcSet: string;
  sizes: string;
} | null {
  if (!imagePath) return null;

  const {
    mobile = 640,
    tablet = 768,
    desktop = 1024,
    large = 1920,
  } = sizes;

  // Generate srcSet for different sizes
  const srcSet = [
    `${getOptimizedImageUrl(imagePath, { width: mobile })} ${mobile}w`,
    `${getOptimizedImageUrl(imagePath, { width: tablet })} ${tablet}w`,
    `${getOptimizedImageUrl(imagePath, { width: desktop })} ${desktop}w`,
    `${getOptimizedImageUrl(imagePath, { width: large })} ${large}w`,
  ].join(', ');

  // Sizes attribute for responsive images
  const sizesAttr = `(max-width: ${mobile}px) ${mobile}px, (max-width: ${tablet}px) ${tablet}px, (max-width: ${desktop}px) ${desktop}px, ${large}px`;

  return {
    src: getOptimizedImageUrl(imagePath, { width: desktop }),
    srcSet,
    sizes: sizesAttr,
  };
}

/**
 * Get optimized product image URL
 */
export function getProductImageUrl(
  imagePath: string | null | undefined,
  size: 'thumbnail' | 'small' | 'medium' | 'large' = 'medium'
): string | null {
  const sizes = {
    thumbnail: { width: 150, height: 150, quality: 75 },
    small: { width: 300, height: 300, quality: 80 },
    medium: { width: 600, height: 600, quality: 85 },
    large: { width: 1200, height: 1200, quality: 90 },
  };

  const sizeConfig = sizes[size];
  return getOptimizedImageUrl(imagePath, {
    ...sizeConfig,
    format: 'webp',
    resize: 'cover',
  });
}

/**
 * Get optimized category/banner image URL
 */
export function getBannerImageUrl(
  imagePath: string | null | undefined,
  width: number = 1920,
  height: number = 600
): string | null {
  return getOptimizedImageUrl(imagePath, {
    width,
    height,
    quality: 85,
    format: 'webp',
    resize: 'cover',
  });
}

/**
 * Get optimized avatar/profile image URL
 */
export function getAvatarImageUrl(
  imagePath: string | null | undefined,
  size: number = 128
): string | null {
  return getOptimizedImageUrl(imagePath, {
    width: size,
    height: size,
    quality: 80,
    format: 'webp',
    resize: 'cover',
  });
}

/**
 * Generate blur placeholder for images (base64 data URL)
 * This can be used with Next.js Image component's placeholder="blur"
 */
export function generateBlurPlaceholder(): string {
  // Simple 1x1 transparent pixel as placeholder
  // In production, you might want to generate actual blur data from the image
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4=';
}

