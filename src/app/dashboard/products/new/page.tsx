/**
 * Create Product Page
 * 
 * Form for creating a new product
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ProductFormClient from '../product-form-client';

export default async function CreateProductPage() {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch categories for dropdown
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let categories: any[] = [];

  try {
    const response = await fetch(`${baseUrl}/api/categories`, {
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

  return <ProductFormClient categories={categories} />;
}

