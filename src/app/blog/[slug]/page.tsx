/**
 * Blog Post Detail Page
 * 
 * Displays a single blog post by slug or ID
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';
import BlogPostClient from './blog-post-client';
import MarketingHeader from '@/components/marketing/header';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  // Try to find blog by slug first, then by ID
  const blog = await prisma.blogs.findFirst({
    where: {
      OR: [
        { slug },
        { id: slug },
      ],
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
  });

  if (!blog) {
    notFound();
  }

  // Fetch related blogs (same category, excluding current blog)
  const relatedBlogs = await prisma.blogs.findMany({
    where: {
      tenant_id: MARKETING_TENANT_ID,
      status: 'published',
      id: { not: blog.id },
      ...(blog.category_id ? { category_id: blog.category_id } : {}),
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
    take: 3,
  });

  return (
    <>
      <MarketingHeader />
      <BlogPostClient blog={blog} relatedBlogs={relatedBlogs} />
    </>
  );
}

