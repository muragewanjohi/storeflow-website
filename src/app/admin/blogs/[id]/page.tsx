/**
 * Edit Blog Page
 * 
 * Page for editing an existing blog post
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import EditBlogForm from './edit-blog-form';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: PageProps) {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const { id } = await params;

  // Fetch blog, tenants, and categories
  const [blog, tenants, blogCategories] = await Promise.all([
    prisma.blogs.findUnique({
      where: { id },
      include: {
        blog_categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    }),
    prisma.tenants.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.blog_categories.findMany({
      where: user.tenant_id 
        ? { tenant_id: user.tenant_id } 
        : { tenant_id: MARKETING_TENANT_ID },
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
    redirect('/admin/blogs');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Blog</h1>
        <p className="text-muted-foreground mt-2">
          Edit blog post: {blog.title}
        </p>
      </div>
      <EditBlogForm blog={blog} tenants={tenants} blogCategories={blogCategories} />
    </div>
  );
}

