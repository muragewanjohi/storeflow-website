/**
 * Storefront SEO Metadata
 * 
 * Helper functions to generate SEO metadata for storefront pages
 */

import type { Metadata } from 'next';
import type { Tenant } from '@/lib/tenant-context';

export interface StorefrontMetadataOptions {
  tenant: Tenant;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

/**
 * Generate metadata for storefront pages
 */
export function generateStorefrontMetadata({
  tenant,
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
}: StorefrontMetadataOptions): Metadata {
  const siteName = tenant.name || `${tenant.subdomain} Store`;
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = description || `Shop at ${siteName} - Discover our amazing products and deals.`;
  
  // Construct full URL
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.${baseDomain}`;
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;

  // Default image (can be tenant logo or storefront image)
  const defaultImage = image || `${baseUrl}/og-image.png`;

  return {
    title: fullTitle,
    description: defaultDescription,
    openGraph: {
      title: fullTitle,
      description: defaultDescription,
      url: fullUrl,
      siteName,
      images: [
        {
          url: defaultImage,
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: defaultDescription,
      images: [defaultImage],
    },
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical: fullUrl,
    },
  };
}

/**
 * Generate product metadata
 */
export function generateProductMetadata({
  tenant,
  productName,
  productDescription,
  productImage,
  productUrl,
  price,
  currency = 'USD',
}: {
  tenant: Tenant;
  productName: string;
  productDescription?: string;
  productImage?: string;
  productUrl: string;
  price?: number;
  currency?: string;
}): Metadata {
  const siteName = tenant.name || `${tenant.subdomain} Store`;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.${baseDomain}`;
  const fullUrl = `${baseUrl}${productUrl}`;
  
  const description = productDescription || `Buy ${productName} at ${siteName}. ${price ? `Price: ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)}` : ''}`;

  // Ensure product image URL is absolute
  const absoluteImageUrl = productImage 
    ? (productImage.startsWith('http') ? productImage : `${baseUrl}${productImage}`)
    : undefined;

  return {
    title: `${productName} | ${siteName}`,
    description,
    openGraph: {
      title: productName,
      description,
      url: fullUrl,
      siteName,
      type: 'website', // Open Graph doesn't support 'product' type, but structured data handles product info
      images: absoluteImageUrl ? [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: productName,
        },
      ] : undefined,
      // Add product-specific Open Graph properties
      ...(price && {
        // Note: Open Graph doesn't have standard price fields, but we include in description
        // Some platforms may parse structured data instead
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: productName,
      description,
      images: absoluteImageUrl ? [absoluteImageUrl] : undefined,
    },
    alternates: {
      canonical: fullUrl,
    },
    // Add other metadata for better social sharing
    other: {
      // Additional meta tags that some platforms recognize
      ...(price && {
        'product:price:amount': price.toString(),
        'product:price:currency': currency,
      }),
    },
  };
}

/**
 * Generate structured data (JSON-LD) for products
 */
export function generateProductStructuredData({
  tenant,
  product,
  productUrl,
}: {
  tenant: Tenant;
  product: {
    name: string;
    description?: string;
    image?: string;
    price?: number;
    currency?: string;
    sku?: string;
    availability?: 'in stock' | 'out of stock' | 'preorder';
  };
  productUrl: string;
}) {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.${baseDomain}`;
  const fullUrl = `${baseUrl}${productUrl}`;

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      url: fullUrl,
      priceCurrency: product.currency || 'USD',
      price: product.price?.toString(),
      availability: `https://schema.org/${product.availability === 'in stock' ? 'InStock' : 'OutOfStock'}`,
    },
  };
}

/**
 * Generate structured data for organization/store
 */
export function generateOrganizationStructuredData({
  tenant,
}: {
  tenant: Tenant;
}) {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.${baseDomain}`;

  return {
    '@context': 'https://schema.org/',
    '@type': 'Store',
    name: tenant.name || `${tenant.subdomain} Store`,
    url: baseUrl,
    contactPoint: tenant.contact_email ? {
      '@type': 'ContactPoint',
      email: tenant.contact_email,
      contactType: 'Customer Service',
    } : undefined,
  };
}

