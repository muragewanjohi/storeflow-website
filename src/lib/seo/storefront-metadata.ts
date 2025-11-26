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
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.dukanest.com`;
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
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.dukanest.com`;
  const fullUrl = `${baseUrl}${productUrl}`;
  
  const description = productDescription || `Buy ${productName} at ${siteName}. ${price ? `Price: ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)}` : ''}`;

  return {
    title: `${productName} | ${siteName}`,
    description,
    openGraph: {
      title: productName,
      description,
      url: fullUrl,
      siteName,
      type: 'website',
      images: productImage ? [
        {
          url: productImage,
          width: 1200,
          height: 630,
          alt: productName,
        },
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: productName,
      description,
      images: productImage ? [productImage] : undefined,
    },
    alternates: {
      canonical: fullUrl,
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
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.dukanest.com`;
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
  const baseUrl = tenant.custom_domain 
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.dukanest.com`;

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

