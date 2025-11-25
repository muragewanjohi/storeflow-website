/**
 * Edit Blog Page
 * 
 * Form for editing an existing blog post
 */

import { notFound } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import BlogFormClient from '../../blog-form-client';

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  const { id } = await params;

  // Fetch blog and categories in parallel for better performance
  // Categories are cached for 60 seconds since they don't change often
  const [blog, categories] = await Promise.all([
    prisma.blogs.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        category_id: true,
        image: true,
        meta_title: true,
        meta_description: true,
        meta_tags: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    prisma.blog_categories.findMany({
      where: {
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  if (!blog) {
    notFound();
  }

  // Ensure status has a default value if null
  const blogWithDefaults = {
    ...blog,
    status: (blog.status || 'draft') as 'draft' | 'published' | 'archived',
  };

  return <BlogFormClient blog={blogWithDefaults} categories={categories} />;
}

