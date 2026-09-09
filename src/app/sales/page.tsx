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
import { isSaleLiveAt } from '@/lib/sales/schedule';
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

  // Status-only query; date window is applied with calendar-day helpers so
  // timezone-naive mobile saves still appear when intended.
  const sales = await prisma.sales.findMany({
    where: {
      tenant_id: tenant.id,
      status: 'active',
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

  const now = new Date();
  const validSales = sales
    .filter((sale) => isSaleLiveAt(now, sale.start_date, sale.end_date))
    .filter((sale) => {
      if (!sale.slug) {
        console.warn('[All Sales Page] Sale missing slug:', sale.id, sale.name);
        return false;
      }
      return true;
    })
    .map((sale) => ({
      ...sale,
      status: (sale.status || 'draft') as 'draft' | 'active' | 'scheduled' | 'ended',
      is_featured: sale.is_featured ?? false,
    }));

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <StorefrontHeader />
        <main className="flex-1">
          <AllSalesClient sales={validSales} />
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
