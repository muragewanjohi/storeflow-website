/**
 * Blog Post Detail Page
 * 
 * Displays a single blog post by slug or ID for the current tenant
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import { requireTenant } from '@/lib/tenant-context/server';
import { generateSlug } from '@/lib/content/validation';
import BlogPostClient from './blog-post-client';

function blogSlugLookupVariants(raw: string): string[] {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const normalized = generateSlug(decoded);
  return [...new Set([raw, decoded, normalized].filter((s) => typeof s === 'string' && s.length > 0))];
}

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: PageProps) {
  try {
    const tenant = await requireTenant();
    const { slug } = await params;

    if (!slug) {
      notFound();
    }

    // Check if slug is a valid UUID format (8-4-4-4-12 hex characters)
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    // Build where clause: try slug first, and ID only if slug looks like a UUID
    const whereClause: any = {
      tenant_id: tenant.id,
      status: 'published',
    };

    const slugVariants = blogSlugLookupVariants(slug);

    if (isUUID) {
      whereClause.OR = [
        { id: slug },
        ...slugVariants.map((s) => ({ slug: s })),
      ];
    } else {
      // Match stored slug, decoded path segment, or normalized (hyphens-only) slug
      whereClause.OR = slugVariants.map((s) => ({ slug: s }));
    }

    // Try to find blog by slug first, then by ID (if UUID format)
    const blog = await prisma.blogs.findFirst({
      where: whereClause,
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

    // Validate required fields
    if (!blog.title) {
      console.error('Blog post missing title:', blog.id);
      notFound();
    }

    // Fetch related blogs (same category, excluding current blog)
    const relatedBlogs = await prisma.blogs.findMany({
      where: {
        tenant_id: tenant.id,
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

    // Serialize dates for client component (Next.js requires JSON-serializable data)
    const serializedBlog = {
      ...blog,
      created_at: blog.created_at ? blog.created_at.toISOString() : null,
      updated_at: blog.updated_at ? blog.updated_at.toISOString() : null,
    };

    const serializedRelatedBlogs = relatedBlogs.map((related) => ({
      ...related,
      created_at: related.created_at ? related.created_at.toISOString() : null,
      updated_at: related.updated_at ? related.updated_at.toISOString() : null,
    }));

    return <BlogPostClient blog={serializedBlog} relatedBlogs={serializedRelatedBlogs} />;
  } catch (error) {
    console.error('Error loading blog post:', error);
    // Re-throw to trigger Next.js error boundary
    throw error;
  }
}

