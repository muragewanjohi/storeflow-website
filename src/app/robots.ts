/**
 * Robots.txt Generation
 * 
 * Generates robots.txt for the current tenant
 * 
 * Day 29: Content Management - SEO & Content Tools
 */

import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getTenant } from '@/lib/tenant-context/server';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    
    const tenant = await getTenant();

    if (!tenant) {
      return {
        rules: {
          userAgent: '*',
          disallow: '/',
        },
      };
    }

    // Get base URL
    const baseUrl = tenant.custom_domain
      ? `https://${tenant.custom_domain}`
      : tenant.subdomain
      ? `https://${tenant.subdomain}.dukanest.com`
      : `https://${hostname}`;

    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/admin/'],
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }
}

