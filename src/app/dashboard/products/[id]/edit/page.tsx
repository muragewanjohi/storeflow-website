/**
 * Edit Product Page
 * 
 * Form for editing an existing product
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ProductFormClient from '../../product-form-client';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch product and categories
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let product: any = null;
  let categories: any[] = [];

  try {
    // Fetch product
    const productResponse = await fetch(`${baseUrl}/api/products/${id}`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (productResponse.ok) {
      const data = await productResponse.json();
      product = data.product;
    } else if (productResponse.status === 404) {
      redirect('/dashboard/products');
    }

    // Fetch categories
    const categoriesResponse = await fetch(`${baseUrl}/api/categories`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (categoriesResponse.ok) {
      const data = await categoriesResponse.json();
      categories = data.categories || [];
    }
  } catch (error) {
    console.error('Error fetching product or categories:', error);
  }

  if (!product) {
    redirect('/dashboard/products');
  }

  return <ProductFormClient product={product} categories={categories} />;
}

