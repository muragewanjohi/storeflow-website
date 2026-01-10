/**
 * Contact Page
 * 
 * Public contact page with contact form
 * Shows marketing contact form on marketing site
 * Shows tenant contact form on tenant sites
 */

import { headers } from 'next/headers';
import { getTenant } from '@/lib/tenant-context/server';
import { getTenantContactEmail } from '@/lib/orders/emails';
import MarketingHeader from '@/components/marketing/header';
import { Footer as MarketingFooter } from '@/components/marketing/footer';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import ContactForm from './contact-form';
import TenantContactForm from './tenant-contact-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const tenant = await getTenant();
  
  if (tenant) {
    return {
      title: `Contact Us - ${tenant.name}`,
      description: `Contact ${tenant.name}. We typically respond within 24 hours.`,
    };
  }
  
  return {
    title: 'Contact Us - Get in Touch | DukaNest',
    description: 'Contact DukaNest support team. We typically respond within 24 hours.',
  };
}

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
  
  // If this is a marketing site, show marketing contact form
  if (isMarketingSite && !tenantId) {
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

  // If this is a tenant site, show tenant contact form
  const tenant = await getTenant();
  
  if (tenant) {
    const tenantContactEmail = getTenantContactEmail(tenant);
    
    return (
      <ThemeProviderWrapper>
        <div className="min-h-screen flex flex-col">
          <StorefrontHeader />
          <main className="flex-1">
            <TenantContactForm 
              tenantName={tenant.name || tenant.subdomain}
              tenantContactEmail={tenantContactEmail}
            />
          </main>
          <StorefrontFooter />
        </div>
      </ThemeProviderWrapper>
    );
  }

  // Fallback: redirect to marketing site if no tenant found
  const marketingDomain = process.env.MARKETING_DOMAIN?.split(':')[0] || 'www.dukanest.com';
  const protocol = hostnameWithoutPort === 'localhost' ? 'http:' : 'https:';
  const port = hostname.includes(':') ? hostname.split(':')[1] : '';
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Store not found</p>
        <a 
          href={`${protocol}//${marketingDomain}${port ? `:${port}` : ''}/contact`}
          className="text-[#0025cc] hover:underline"
        >
          Go to Contact Page
        </a>
      </div>
    </div>
  );
}
