/**
 * Blog Listing Page
 * 
 * Displays all published blog posts for the current tenant
 */

import { prisma } from '@/lib/prisma/client';
import { requireTenant } from '@/lib/tenant-context/server';
import BlogListingClient from './blog-listing-client';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';

export const dynamic = 'force-dynamic';

export default async function BlogListingPage() {
  const tenant = await requireTenant();
  
  // Fetch all published blogs for this tenant
  const blogs = await prisma.blogs.findMany({
    where: {
      tenant_id: tenant.id,
      status: 'published',
    },
    include: {
      blog_categories: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen flex flex-col bg-white">
        <StorefrontHeader />
        <main className="flex-1">
          <BlogListingClient blogs={blogs} />
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}

