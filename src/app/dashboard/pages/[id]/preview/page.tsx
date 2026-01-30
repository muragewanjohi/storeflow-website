/**
 * Page Preview
 *
 * Renders a page (draft or published) as it will appear on the storefront.
 * Only accessible to authenticated tenant staff. Used to preview before publishing.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { SectionRenderer } from '@/components/content/page-builder/section-templates';
import { PageBuilderData } from '@/lib/content/page-builder-types';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ArrowLeftIcon, EyeIcon } from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';

export default async function PagePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    notFound();
  }

  const { id } = await params;

  const page = await prisma.pages.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
  });

  if (!page) {
    notFound();
  }

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
      richTextContent = page.content;
    }
  }

  const firstSection = pageData?.sections?.sort((a: any, b: any) => a.order - b.order)[0];
  const hasHeroSectionFirst = firstSection?.type === 'hero';
  const shouldShowBanner = page.banner_image && !(isPageBuilder && hasHeroSectionFirst);

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen flex flex-col">
        {/* Preview banner - only visible in dashboard preview */}
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <div className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5" />
            <span className="font-medium">Preview</span>
            <span className="text-amber-700 dark:text-amber-300">
              — This is how your page will look when published. Status: {page.status ?? 'draft'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/pages/${page.id}/edit`}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to edit
              </Link>
            </Button>
          </div>
        </div>

        <StorefrontHeader />
        <main className="flex-1">
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
                />
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

          <div className={`${isPageBuilder && hasHeroSectionFirst ? '' : 'container mx-auto px-4'} py-8 md:py-12`}>
            {!page.banner_image && !hasHeroSectionFirst && (!isPageBuilder || !pageData?.sections?.length) && (
              <div className="mb-8 container mx-auto px-4">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{page.title}</h1>
              </div>
            )}

            {isPageBuilder && pageData?.sections && pageData.sections.length > 0 ? (
              <div className="space-y-0">
                {pageData.sections
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((section: any) => (
                    <SectionRenderer key={section.id} section={section} isPreview={false} />
                  ))}
              </div>
            ) : richTextContent ? (
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: richTextContent }}
              />
            ) : (
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
