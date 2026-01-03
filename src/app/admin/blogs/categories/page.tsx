/**
 * Blog Categories Page
 * 
 * Page for managing blog categories
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import BlogCategoriesClient from './blog-categories-client';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';

export const dynamic = 'force-dynamic';

export default async function BlogCategoriesPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // For landlords, fetch marketing categories (categories with marketing tenant_id)
  // For tenant users, fetch their tenant's categories
  const categories = await prisma.blog_categories.findMany({
    where: user.tenant_id 
      ? { tenant_id: user.tenant_id } 
      : { tenant_id: MARKETING_TENANT_ID },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Blog Categories</h1>
        <p className="text-muted-foreground mt-2">
          Manage blog categories for {user.role === 'landlord' ? 'marketing blogs' : 'your tenant'}
        </p>
      </div>
      <BlogCategoriesClient categories={categories} userRole={user.role} />
    </div>
  );
}

