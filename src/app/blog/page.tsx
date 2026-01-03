/**
 * Blog Listing Page
 * 
 * Displays all published marketing blog posts
 */

import { prisma } from '@/lib/prisma/client';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';
import BlogListingClient from './blog-listing-client';
import MarketingHeader from '@/components/marketing/header';

export const dynamic = 'force-dynamic';

export default async function BlogListingPage() {
  // Fetch all published marketing blogs
  const blogs = await prisma.blogs.findMany({
    where: {
      tenant_id: MARKETING_TENANT_ID,
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
    <>
      <MarketingHeader />
      <BlogListingClient blogs={blogs} />
    </>
  );
}

