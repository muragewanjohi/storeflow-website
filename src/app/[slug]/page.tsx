/**
 * Dynamic Page Route
 * 
 * Renders pages by slug (e.g., /about, /contact, /shop)
 * Displays banner image at the top, then page content
 * 
 * Day 28: Content Management - Dynamic Pages
 */

import { notFound } from 'next/navigation';
import { getTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { SectionRenderer } from '@/components/content/page-builder/section-templates';
import { PageBuilderData } from '@/lib/content/page-builder-types';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<any> {
  const { slug } = await params;
  const tenant = await getTenant();
  
  if (!tenant) {
    return {
      title: 'Page Not Found',
    };
  }

  const page = await prisma.pages.findFirst({
    where: {
      tenant_id: tenant.id,
      slug,
      status: 'published',
    },
  });

  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  return generateStorefrontMetadata({
    tenant,
    title: page.meta_title || page.title,
    description: page.meta_description || undefined,
    url: `/${slug}`,
  });
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const tenant = await getTenant();

  if (!tenant) {
    notFound();
  }

  // Fetch the page by slug
  const page = await prisma.pages.findFirst({
    where: {
      tenant_id: tenant.id,
      slug,
      status: 'published',
    },
  });

  if (!page) {
    notFound();
  }

  // Determine content type
  let isPageBuilder = false;
  let pageData: PageBuilderData | null = null;
  let richTextContent = '';

  if (page.content) {
    try {
      const parsed = JSON.parse(page.content);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
        isPageBuilder = true;
        pageData = parsed;
      } else {
        richTextContent = page.content;
      }
    } catch {
      // Not JSON, treat as rich text
      richTextContent = page.content;
    }
  }

  // Check if first section is a hero section (to avoid redundancy with banner image)
  const firstSection = pageData?.sections?.sort((a: any, b: any) => a.order - b.order)[0];
  const hasHeroSectionFirst = firstSection?.type === 'hero';
  
  // Only show banner image if:
  // 1. Banner image exists
  // 2. NOT using page builder with hero section as first section (to avoid redundancy)
  const shouldShowBanner = page.banner_image && !(isPageBuilder && hasHeroSectionFirst);

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen flex flex-col">
        <StorefrontHeader />
        <main className="flex-1">
        {/* Banner Image - Displayed at the top of the page (only if no hero section first) */}
        {shouldShowBanner && (
          <section className="relative w-full">
            <div className="relative h-[300px] md:h-[400px] lg:h-[500px] w-full">
              <Image
                src={page.banner_image || ''}
                alt={page.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
                onError={(e) => {
                  // Hide image if it fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              {/* Optional: Overlay with page title */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                <div className="container mx-auto px-4 pb-8">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                    {page.title}
                  </h1>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Page Content */}
        <div className={`${isPageBuilder && hasHeroSectionFirst ? '' : 'container mx-auto px-4'} py-8 md:py-12`}>
          {/* If no banner image AND no hero section first, show title here */}
          {!page.banner_image && !hasHeroSectionFirst && (
            <div className="mb-8 container mx-auto px-4">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{page.title}</h1>
            </div>
          )}

          {/* Page Builder Content */}
          {isPageBuilder && pageData && pageData.sections && pageData.sections.length > 0 ? (
            <div className="space-y-0">
              {pageData.sections
                .sort((a: any, b: any) => a.order - b.order)
                .map((section: any) => (
                  <SectionRenderer key={section.id} section={section} isPreview={false} />
                ))}
            </div>
          ) : richTextContent ? (
            /* Rich Text Content */
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: richTextContent }}
            />
          ) : (
            /* Empty Content */
            <div className="text-center py-12 text-muted-foreground">
              <p>This page has no content yet.</p>
            </div>
          )}
        </div>
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
