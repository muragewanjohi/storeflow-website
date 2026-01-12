/**
 * Sale Editor Page
 * 
 * Form for editing an existing sale
 * 
 * Phase 3: Dashboard UI - Sales Implementation
 */

import { notFound, redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import SaleFormClient from '../sale-form-client';

export default async function EditSalePage({
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

  // Fetch sale with products
  const sale = await prisma.sales.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
    include: {
      product_sales: {
        include: {
          products: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              sale_price: true,
              image: true,
              stock_quantity: true,
              status: true,
            },
          },
        },
        orderBy: {
          order_index: 'asc',
        },
      },
    },
  });

  if (!sale) {
    notFound();
  }

  // Get base URL for preview
  const baseUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : tenant.subdomain
    ? `https://${tenant.subdomain}.dukanest.com`
    : 'https://example.com';

  // Map sale to match Sale interface (handle null status and convert Decimal to number)
  const mappedSale = {
    ...sale,
    status: (sale.status || 'draft') as 'draft' | 'active' | 'scheduled' | 'ended',
    is_featured: sale.is_featured ?? false,
    product_sales: sale.product_sales.map((ps) => ({
      ...ps,
      sale_price: ps.sale_price ? Number(ps.sale_price) : null,
      discount_percent: ps.discount_percent ? Number(ps.discount_percent) : null,
      products: {
        ...ps.products,
        price: Number(ps.products.price),
        sale_price: ps.products.sale_price ? Number(ps.products.sale_price) : null,
        status: ps.products.status || 'active',
      },
    })),
  };

  return <SaleFormClient sale={mappedSale} baseUrl={baseUrl} />;
}
