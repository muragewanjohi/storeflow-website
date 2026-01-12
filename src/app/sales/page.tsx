/**
 * All Sales Page
 * 
 * Public-facing page listing all active sales
 * 
 * Phase 4: Storefront - Sales Implementation
 */

import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';
import AllSalesClient from './all-sales-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await requireTenant();
  return generateStorefrontMetadata({
    tenant,
    title: 'Sales',
    description: `Browse all active sales and special offers at ${tenant.name || tenant.subdomain}`,
    url: '/sales',
  });
}

export default async function AllSalesPage() {
  const tenant = await requireTenant();

  // Fetch all active sales
  const now = new Date();
  const sales = await prisma.sales.findMany({
    where: {
      tenant_id: tenant.id,
      status: 'active',
      OR: [
        { start_date: null },
        { start_date: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { end_date: null },
            { end_date: { gte: now } },
          ],
        },
      ],
    },
    include: {
      _count: {
        select: {
          product_sales: true,
        },
      },
    },
    orderBy: [
      { is_featured: 'desc' },
      { created_at: 'desc' },
    ],
  });

  // Filter sales that are actually active based on dates
  const activeSales = sales.filter((sale) => {
    const startDate = sale.start_date ? new Date(sale.start_date) : null;
    const endDate = sale.end_date ? new Date(sale.end_date) : null;
    return (!startDate || now >= startDate) && (!endDate || now <= endDate);
  });

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <StorefrontHeader />
        <main className="flex-1">
          <AllSalesClient sales={activeSales.map(sale => ({
            ...sale,
            status: (sale.status || 'draft') as 'draft' | 'active' | 'scheduled' | 'ended',
            is_featured: sale.is_featured ?? false,
          }))} />
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
