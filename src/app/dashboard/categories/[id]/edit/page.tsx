/**
 * Edit Category Page
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CategoryFormClient from '../../category-form-client';

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch category and parent categories
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let category: any = null;
  let parentCategories: any[] = [];

  try {
    // Fetch category
    const categoryResponse = await fetch(`${baseUrl}/api/categories/${id}`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (categoryResponse.ok) {
      const data = await categoryResponse.json();
      category = data.category;
    } else if (categoryResponse.status === 404) {
      redirect('/dashboard/categories');
    }

    // Fetch parent categories
    const parentsResponse = await fetch(`${baseUrl}/api/categories?include_children=false`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (parentsResponse.ok) {
      const data = await parentsResponse.json();
      parentCategories = data.categories || [];
    }
  } catch (error) {
    console.error('Error fetching category:', error);
  }

  if (!category) {
    redirect('/dashboard/categories');
  }

  return <CategoryFormClient category={category} parentCategories={parentCategories} />;
}

