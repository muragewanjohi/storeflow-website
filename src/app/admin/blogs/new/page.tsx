/**
 * Create Blog Page
 * 
 * Page for creating a new blog post
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import CreateBlogForm from './create-blog-form';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';

export const dynamic = 'force-dynamic';

export default async function CreateBlogPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // For landlords, fetch all tenants (they can create blogs for any tenant)
  // For tenant users, tenant_id will be auto-detected from their context
  const tenants = await prisma.tenants.findMany({
    select: {
      id: true,
      name: true,
      subdomain: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch blog categories - for landlords, show marketing categories (categories with marketing tenant_id)
  // For tenant users, show their tenant's categories
  const blogCategories = await prisma.blog_categories.findMany({
    where: user.tenant_id 
      ? { tenant_id: user.tenant_id } 
      : { tenant_id: MARKETING_TENANT_ID }, // Landlords see marketing categories
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Blog</h1>
        <p className="text-muted-foreground mt-2">
          Create a new blog post
        </p>
      </div>
      <CreateBlogForm 
        userTenantId={user.tenant_id} 
        userRole={user.role}
        tenants={tenants} 
        blogCategories={blogCategories} 
      />
    </div>
  );
}

