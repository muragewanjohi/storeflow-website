/**
 * User Guide Page
 * 
 * Public page displaying user guides with images
 * Only accessible on marketing site (www.dukanest.com), not on tenant sites
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import UserGuideContent from './user-guide-content';
import MarketingHeader from '@/components/marketing/header';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'User Guide - Help & Support | DukaNest',
  description: 'Complete user guide for shopping, account management, and support on DukaNest stores',
};

export default async function HelpPage() {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const tenantId = headersList.get('x-tenant-id');
  const hostnameWithoutPort = hostname.split(':')[0];
  
  // Check if this is a marketing site
  const hasDefaultTenant = process.env.DEFAULT_TENANT_SUBDOMAIN && 
                           process.env.DEFAULT_TENANT_SUBDOMAIN.trim() !== '';
  
  const isMarketingSite = 
    hostnameWithoutPort === 'www' ||
    hostnameWithoutPort === 'marketing' ||
    hostnameWithoutPort === 'www.dukanest.com' ||
    hostnameWithoutPort === 'dukanest.com' ||
    (hostnameWithoutPort === 'localhost' && !hasDefaultTenant) ||
    hostnameWithoutPort === '127.0.0.1' ||
    hostnameWithoutPort.includes('dukanest') ||
    hostnameWithoutPort.includes('storeflow') ||
    hostnameWithoutPort.includes('vercel.app') ||
    hostnameWithoutPort === process.env.MARKETING_DOMAIN?.split(':')[0];
  
  // If this is a tenant site, redirect to marketing site help page
  if (tenantId || !isMarketingSite) {
    const marketingDomain = process.env.MARKETING_DOMAIN?.split(':')[0] || 'www.dukanest.com';
    const protocol = hostnameWithoutPort === 'localhost' ? 'http:' : 'https:';
    const port = hostname.includes(':') ? hostname.split(':')[1] : '';
    redirect(`${protocol}//${marketingDomain}${port ? `:${port}` : ''}/help`);
  }

  // Fetch user guide data from database
  const categories = await prisma.user_guide_categories.findMany({
    where: {
      is_active: true,
    },
    include: {
      articles: {
        where: {
          is_active: true,
        },
        orderBy: {
          sort_order: 'asc',
        },
      },
    },
    orderBy: {
      sort_order: 'asc',
    },
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <MarketingHeader />
      <main className="flex-1 min-h-0">
        <UserGuideContent tenantName="DukaNest Stores" categories={categories} />
      </main>
    </div>
  );
}

