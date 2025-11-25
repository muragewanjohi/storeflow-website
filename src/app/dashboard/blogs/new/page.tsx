/**
 * Create Blog Page
 * 
 * Form for creating a new blog post
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import BlogFormClient from '../blog-form-client';

export default async function NewBlogPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  // Fetch categories for the form
  const categories = await prisma.blog_categories.findMany({
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
  });

  return <BlogFormClient categories={categories} />;
}

