/**
 * Blogs List Page
 * 
 * Displays all blogs for the admin
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import BlogsListClient from './blogs-list-client';
import { MARKETING_TENANT_ID, isMarketingBlog } from '@/lib/content/marketing';

export const dynamic = 'force-dynamic';

export default async function BlogsPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all blogs (for admin, we show all blogs across all tenants + marketing blogs)
  // Note: Marketing blogs use a special tenant_id that may not exist in tenants table
  // We'll handle null tenants in the client component
  const blogsRaw = await prisma.blogs.findMany({
    orderBy: {
      created_at: 'desc',
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

  // Fetch tenants separately and map them (exclude marketing tenant_id)
  const tenantIds = [...new Set(blogsRaw.map(b => b.tenant_id).filter(Boolean))]
    .filter(id => !isMarketingBlog(id)); // Exclude marketing tenant_id
  
  const tenantsMap = new Map();
  
  if (tenantIds.length > 0) {
    const tenants = await prisma.tenants.findMany({
      where: {
        id: { in: tenantIds },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
      },
    });
    
    tenants.forEach(tenant => {
      tenantsMap.set(tenant.id, tenant);
    });
  }

  // Map blogs with tenants (null for marketing blogs)
  const blogs = blogsRaw.map(blog => ({
    ...blog,
    tenants: isMarketingBlog(blog.tenant_id) ? null : (tenantsMap.get(blog.tenant_id) || null),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Blogs</h1>
        <p className="text-muted-foreground mt-2">
          Manage all blog posts across all tenants
        </p>
      </div>
      <BlogsListClient blogs={blogs} />
    </div>
  );
}

