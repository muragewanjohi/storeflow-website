/**
 * Contact Page
 * 
 * Public contact page with contact form
 * Shows marketing contact form on marketing site
 * Shows tenant custom page (if exists) or default contact form on tenant sites
 */

import { headers } from 'next/headers';
import { getTenant } from '@/lib/tenant-context/server';
import { getTenantContactEmail } from '@/lib/orders/emails';
import { prisma } from '@/lib/prisma/client';
import { SectionRenderer } from '@/components/content/page-builder/section-templates';
import { PageBuilderData } from '@/lib/content/page-builder-types';
import MarketingHeader from '@/components/marketing/header';
import { Footer as MarketingFooter } from '@/components/marketing/footer';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import ContactForm from './contact-form';
import TenantContactForm from './tenant-contact-form';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const tenant = await getTenant();
  
  if (tenant) {
    // Check for custom contact page
    const customPage = await prisma.pages.findFirst({
      where: {
        tenant_id: tenant.id,
        slug: 'contact',
        status: 'published',
      },
    });
    
    if (customPage) {
      return {
        title: customPage.meta_title || customPage.title || `Contact Us - ${tenant.name}`,
        description: customPage.meta_description || `Contact ${tenant.name}. We typically respond within 24 hours.`,
      };
    }
    
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
    hostnameWithoutPort === 'www.storeflow.com' ||
    hostnameWithoutPort === 'storeflow.com' ||
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

  // If this is a tenant site, check for custom contact page first
  const tenant = await getTenant();
  
  if (tenant) {
    // Check for custom contact page in the database
    const customPage = await prisma.pages.findFirst({
      where: {
        tenant_id: tenant.id,
        slug: 'contact',
        status: 'published',
      },
    });
    
    // If custom page exists with content, render it
    if (customPage?.content) {
      try {
        const pageData: PageBuilderData = JSON.parse(customPage.content);
        if (pageData.sections && pageData.sections.length > 0) {
          // Check if first section is a hero section
          const firstSection = pageData.sections.sort((a: any, b: any) => a.order - b.order)[0];
          const hasHeroSectionFirst = firstSection?.type === 'hero';
          const shouldShowBanner = customPage.banner_image && !hasHeroSectionFirst;
          
          return (
            <ThemeProviderWrapper>
              <div className="min-h-screen flex flex-col">
                <StorefrontHeader />
                <main className="flex-1">
                  {/* Banner Image */}
                  {shouldShowBanner && (
                    <section className="relative w-full">
                      <div className="relative h-[300px] md:h-[400px] lg:h-[500px] w-full">
                        <Image
                          src={customPage.banner_image || ''}
                          alt={customPage.title}
                          fill
                          className="object-cover"
                          priority
                          sizes="100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                          <div className="container mx-auto px-4 pb-8">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                              {customPage.title}
                            </h1>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                  
                  {/* Page Builder Content */}
                  <div className="container mx-auto px-4 py-8 md:py-12">
                    {/* Don't show page title if page has page builder sections - sections handle their own titles */}
                    {!customPage.banner_image && !hasHeroSectionFirst && (!pageData || !pageData.sections || pageData.sections.length === 0) && (
                      <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">{customPage.title}</h1>
                      </div>
                    )}
                    <div className="space-y-0">
                      {pageData.sections
                        .filter((s: any) => !s.hidden)
                        .sort((a: any, b: any) => a.order - b.order)
                        .map((section: any) => (
                          <SectionRenderer key={section.id} section={section} isPreview={false} />
                        ))}
                    </div>
                  </div>
                </main>
                <StorefrontFooter />
              </div>
            </ThemeProviderWrapper>
          );
        }
      } catch {
        // If JSON parsing fails, check for rich text content
        if (customPage.content && !customPage.content.startsWith('{')) {
          return (
            <ThemeProviderWrapper>
              <div className="min-h-screen flex flex-col">
                <StorefrontHeader />
                <main className="flex-1">
                  <div className="container mx-auto px-4 py-8 md:py-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-8">{customPage.title}</h1>
                    <div 
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: customPage.content }}
                    />
                  </div>
                </main>
                <StorefrontFooter />
              </div>
            </ThemeProviderWrapper>
          );
        }
      }
    }
    
    // Fallback: Show default tenant contact form
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
