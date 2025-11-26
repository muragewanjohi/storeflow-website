/**
 * Sitemap Generation
 * 
 * Generates XML sitemap for the current tenant
 * 
 * Day 29: Content Management - SEO & Content Tools
 */

import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    
    const tenant = await getTenant();

    if (!tenant) {
      return [];
    }

    // Get base URL
    const baseUrl = tenant.custom_domain
      ? `https://${tenant.custom_domain}`
      : tenant.subdomain
      ? `https://${tenant.subdomain}.dukanest.com`
      : `https://${hostname}`;

    // Get published pages
    const pages = await prisma.pages.findMany({
      where: {
        tenant_id: tenant.id,
        status: 'published',
      },
      select: {
        slug: true,
        updated_at: true,
      },
    });

    // Get published blog posts
    const blogs = await prisma.blogs.findMany({
      where: {
        tenant_id: tenant.id,
        status: 'published',
      },
      select: {
        slug: true,
        updated_at: true,
      },
    });

    // Build sitemap entries
    const entries: MetadataRoute.Sitemap = [
      // Homepage
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      // Pages
      ...pages.map((page) => ({
        url: `${baseUrl}/${page.slug || ''}`,
        lastModified: page.updated_at || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      // Blog posts
      ...blogs.map((blog) => ({
        url: `${baseUrl}/blog/${blog.slug || ''}`,
        lastModified: blog.updated_at || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];

    return entries;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [];
  }
}

