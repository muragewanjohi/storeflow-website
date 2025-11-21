/**
 * Categories Management Page
 * 
 * Lists all categories for the tenant
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CategoriesListClient from './categories-list-client';

export default async function CategoriesPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch categories
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let categories: any[] = [];

  try {
    const response = await fetch(`${baseUrl}/api/categories?include_children=true`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      categories = data.categories || [];
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
  }

  return <CategoriesListClient initialCategories={categories} />;
}

