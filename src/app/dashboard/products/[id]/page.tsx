/**
 * Product Detail Page
 * 
 * Shows detailed information about a single product
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ProductDetailClient from './product-detail-client';

export default async function ProductDetailPage({
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

  // Fetch product
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let product: any = null;
  let variants: any[] = [];

  try {
    const response = await fetch(`${baseUrl}/api/products/${id}`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      product = data.product;
      variants = data.product?.variants || [];
    } else if (response.status === 404) {
      redirect('/dashboard/products');
    }
  } catch (error) {
    console.error('Error fetching product:', error);
  }

  if (!product) {
    redirect('/dashboard/products');
  }

  return <ProductDetailClient product={product} variants={variants} />;
}

