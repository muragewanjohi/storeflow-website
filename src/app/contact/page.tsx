/**
 * Contact Page
 * 
 * Public contact page with contact form
 * Only accessible on marketing site (www.dukanest.com), not on tenant sites
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import MarketingHeader from '@/components/marketing/header';
import { Footer as MarketingFooter } from '@/components/marketing/footer';
import ContactForm from './contact-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact Us - Get in Touch | DukaNest',
  description: 'Contact DukaNest support team. We typically respond within 24 hours.',
};

export default async function ContactPage() {
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
    hostnameWithoutPort.includes('storeflow') ||
    hostnameWithoutPort.includes('vercel.app') ||
    hostnameWithoutPort === process.env.MARKETING_DOMAIN?.split(':')[0];
  
  // If this is a tenant site, redirect to marketing site contact page
  if (tenantId || !isMarketingSite) {
    const marketingDomain = process.env.MARKETING_DOMAIN?.split(':')[0] || 'www.dukanest.com';
    const protocol = hostnameWithoutPort === 'localhost' ? 'http:' : 'https:';
    const port = hostname.includes(':') ? hostname.split(':')[1] : '';
    redirect(`${protocol}//${marketingDomain}${port ? `:${port}` : ''}/contact`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <ContactForm />
      </main>
      <MarketingFooter />
    </div>
  );
}
