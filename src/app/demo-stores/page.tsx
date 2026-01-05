/**
 * Demo Stores Showcase Page
 * 
 * Displays all available demo stores for visitors to explore
 */

import { prisma } from '@/lib/prisma/client';
import { isDemoStore } from '@/lib/demo-store/seed-demo-data';
import MarketingHeader from '@/components/marketing/header';
import { Footer as MarketingFooter } from '@/components/marketing/footer';
import DemoStoresClient from './demo-stores-client';

export const dynamic = 'force-dynamic';

export default async function DemoStoresPage() {
  // Fetch all active tenants
  const tenants = await prisma.tenants.findMany({
    where: {
      status: 'active',
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      custom_domain: true,
      theme_slug: true,
      data: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // Filter to only demo stores
  const demoStores = tenants
    .filter(tenant => isDemoStore(tenant))
    .map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      theme_slug: tenant.theme_slug,
      url: tenant.custom_domain 
        ? `https://${tenant.custom_domain}`
        : `https://${tenant.subdomain}.dukanest.com`,
      created_at: tenant.created_at,
    }));

  return (
    <>
      <MarketingHeader />
      <DemoStoresClient demoStores={demoStores} />
      <MarketingFooter />
    </>
  );
}

