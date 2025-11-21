/**
 * Create Category Page
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CategoryFormClient from '../category-form-client';

export default async function CreateCategoryPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch parent categories
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let parentCategories: any[] = [];

  try {
    const response = await fetch(`${baseUrl}/api/categories?include_children=false`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      parentCategories = data.categories || [];
    }
  } catch (error) {
    console.error('Error fetching parent categories:', error);
  }

  return <CategoryFormClient parentCategories={parentCategories} />;
}

