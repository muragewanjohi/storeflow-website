import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import {
  getHomepageLayout,
  convertLegacyLayoutToPageBuilder,
  createDefaultHomepageTemplate,
} from '@/lib/themes/homepage-templates';
import { getThemeDefaults, getBusinessTypeColorScheme } from '@/lib/themes/theme-defaults';
import { getAdditionalPageTemplates } from '@/lib/themes/additional-pages';
import { createDemoContent } from '@/lib/themes/demo-content';
import { trackThemeInstallation } from '@/lib/themes/theme-installation-analytics';
import { generateSlug } from '@/lib/content/validation';
import { persistHomepageInstallSnapshot } from '@/lib/onboarding/onboarding-reward';
import { canInstallTheme } from '@/lib/themes/theme-access';
import type { Tenant } from '@/lib/tenant-context';

export class ThemeInstallError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'ThemeInstallError';
  }
}

export type InstallThemeBody = {
  theme_id?: string;
  themeId?: string;
  include_demo_content?: boolean;
  includeDemoContent?: boolean;
  include_demo_attributes?: boolean;
  includeDemoAttributes?: boolean;
  business_type?: string;
  businessType?: string;
};

export type InstallThemeResult = {
  tenant_theme: Awaited<ReturnType<typeof prisma.tenant_themes.update>>;
  homepage_created: boolean;
  additional_pages_created: number;
  defaults_applied: boolean;
  demo_content_created: boolean;
  demo_categories_created: number;
  demo_products_created: number;
  demo_attributes_created: number;
  demo_pages_created: number;
  demo_sales_created: number;
  demo_blogs_created: number;
  demo_blog_categories_created: number;
  demo_forms_created: number;
  status: 200 | 201;
};

function normalizeInstallThemeBody(body: InstallThemeBody) {
  return {
    theme_id: body.theme_id ?? body.themeId,
    include_demo_content: body.include_demo_content ?? body.includeDemoContent,
    include_demo_attributes: body.include_demo_attributes ?? body.includeDemoAttributes,
    business_type: body.business_type ?? body.businessType,
  };
}

function cleanBlobUrlsFromPageBuilder(pageBuilderData: unknown): unknown {
  if (
    !pageBuilderData ||
    typeof pageBuilderData !== 'object' ||
    !('sections' in pageBuilderData) ||
    !Array.isArray((pageBuilderData as { sections: unknown }).sections)
  ) {
    return pageBuilderData;
  }

  const data = pageBuilderData as { sections: Record<string, unknown>[]; [key: string]: unknown };
  const cleanedSections = data.sections.map((section) => {
    const cleaned: Record<string, unknown> = { ...section };

    if (
      cleaned.type === 'hero' &&
      typeof cleaned.image === 'string' &&
      cleaned.image.startsWith('blob:')
    ) {
      console.warn('[Theme Install] Removing blob URL from hero section image:', cleaned.image);
      delete cleaned.image;
    }

    if (
      cleaned.type === 'image' &&
      typeof cleaned.image === 'string' &&
      cleaned.image.startsWith('blob:')
    ) {
      console.warn('[Theme Install] Removing blob URL from image section:', cleaned.image);
      delete cleaned.image;
    }

    if (cleaned.type === 'features' && Array.isArray(cleaned.features)) {
      cleaned.features = cleaned.features.map((feature: Record<string, unknown>) => {
        if (typeof feature.image === 'string' && feature.image.startsWith('blob:')) {
          console.warn('[Theme Install] Removing blob URL from feature image:', feature.image);
          delete feature.image;
        }
        return feature;
      });
    }

    if (cleaned.type === 'testimonials' && Array.isArray(cleaned.testimonials)) {
      cleaned.testimonials = cleaned.testimonials.map((testimonial: Record<string, unknown>) => {
        if (typeof testimonial.image === 'string' && testimonial.image.startsWith('blob:')) {
          console.warn(
            '[Theme Install] Removing blob URL from testimonial image:',
            testimonial.image,
          );
          delete testimonial.image;
        }
        return testimonial;
      });
    }

    return cleaned;
  });

  return {
    ...data,
    sections: cleanedSections,
  };
}

export async function installThemeForTenant(
  tenant: Tenant,
  body: InstallThemeBody,
  request: NextRequest,
): Promise<InstallThemeResult> {
  const startTime = Date.now();
  const normalized = normalizeInstallThemeBody(body);
  const { theme_id, include_demo_content, include_demo_attributes, business_type } = normalized;

  console.log('[Theme Install] Installation request:', {
    theme_id,
    include_demo_content,
    tenant_id: tenant.id,
    tenant_name: tenant.name,
  });

  if (!theme_id) {
    throw new ThemeInstallError('Theme ID is required', 400);
  }

  const theme = await prisma.themes.findUnique({
    where: { id: theme_id },
  });

  if (!theme) {
    throw new ThemeInstallError('Theme not found', 404);
  }

  // Theme Track A4 — real Basic/Pro gating, same check as web's
  // /api/themes/install/route.ts. Every theme ships with is_premium: false
  // today (DA.30), so this is a no-op until a theme is actually flipped to
  // premium, but it's the real enforcement point once one is.
  if (theme.is_premium) {
    const plan = tenant.plan_id
      ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id }, select: { name: true } })
      : null;
    if (!canInstallTheme(plan?.name, theme)) {
      throw new ThemeInstallError(`"${theme.title}" is a Pro theme. Upgrade your plan to install it.`, 403);
    }
  }

  await prisma.tenant_themes.updateMany({
    where: {
      tenant_id: tenant.id,
      is_active: true,
    },
    data: {
      is_active: false,
    },
  });

  const existingTenantTheme = await prisma.tenant_themes.findFirst({
    where: {
      tenant_id: tenant.id,
      theme_id,
    },
  });

  let tenantTheme;
  let isNewInstall = false;

  if (existingTenantTheme) {
    const updateData: Prisma.tenant_themesUpdateInput = {
      is_active: true,
      updated_at: new Date(),
    };

    if (business_type) {
      const themeDefaults = getThemeDefaults(theme.slug);
      const businessColors = getBusinessTypeColorScheme(business_type);
      if (businessColors) {
        updateData.custom_colors = { ...(themeDefaults?.colors || {}), ...businessColors };
      }
    }

    tenantTheme = await prisma.tenant_themes.update({
      where: {
        id: existingTenantTheme.id,
      },
      data: updateData,
    });
  } else {
    isNewInstall = true;

    const themeDefaults = getThemeDefaults(theme.slug);

    let finalColors = themeDefaults?.colors || {};
    if (business_type) {
      const businessColors = getBusinessTypeColorScheme(business_type);
      if (businessColors) {
        finalColors = { ...finalColors, ...businessColors };
      }
    }

    tenantTheme = await prisma.tenant_themes.create({
      data: {
        tenant_id: tenant.id,
        theme_id,
        is_active: true,
        custom_colors: finalColors,
        custom_fonts: themeDefaults?.fonts || {},
      },
    });
  }

  let homepageCreated = false;
  let additionalPagesCreated = 0;
  let demoContentCreated = false;
  let demoCategoriesCreated = 0;
  let demoProductsCreated = 0;
  let demoAttributesCreated = 0;

  console.log('[Theme Install] Starting page creation process:', {
    isNewInstall,
    tenantId: tenant.id,
    tenantName: tenant.name,
  });

  try {
    const pageTitle = 'Home';
    const pageSlug = generateSlug('home');

    const existingHomepage = await prisma.pages.findFirst({
      where: {
        tenant_id: tenant.id,
        slug: pageSlug,
      },
    });

    const layoutData = getHomepageLayout(theme.slug);

    let pageBuilderData;
    if (layoutData && layoutData.length > 0) {
      pageBuilderData = convertLegacyLayoutToPageBuilder(layoutData);
    } else {
      pageBuilderData = createDefaultHomepageTemplate(theme.slug, tenant.name, business_type);
    }

    pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

    if (!existingHomepage) {
      const createdHomepage = await prisma.pages.create({
        data: {
          tenant_id: tenant.id,
          title: pageTitle,
          slug: pageSlug,
          content: JSON.stringify(pageBuilderData),
          status: 'published',
          banner_image: null,
          meta_title: `${tenant.name} - Home`,
          meta_description: `Welcome to ${tenant.name}. Shop our amazing products and discover great deals.`,
        },
      });
      homepageCreated = true;
      console.log('[Theme Install] Homepage created successfully:', {
        id: createdHomepage.id,
        slug: createdHomepage.slug,
        title: createdHomepage.title,
        status: createdHomepage.status,
        tenant_id: createdHomepage.tenant_id,
      });
      await persistHomepageInstallSnapshot(tenant.id, pageBuilderData);
    } else {
      const updatedHomepage = await prisma.pages.update({
        where: { id: existingHomepage.id },
        data: {
          title: pageTitle,
          content: JSON.stringify(pageBuilderData),
          status: 'published',
          banner_image: existingHomepage.banner_image?.startsWith('blob:')
            ? null
            : existingHomepage.banner_image,
          meta_title: `${tenant.name} - Home`,
          meta_description: `Welcome to ${tenant.name}. Shop our amazing products and discover great deals.`,
          updated_at: new Date(),
        },
      });
      homepageCreated = true;
      console.log('[Theme Install] Homepage updated successfully:', {
        id: updatedHomepage.id,
        slug: updatedHomepage.slug,
        title: updatedHomepage.title,
        status: updatedHomepage.status,
      });
      await persistHomepageInstallSnapshot(tenant.id, pageBuilderData);
    }
  } catch (homepageError: unknown) {
    const err = homepageError as { message?: string; code?: string; meta?: unknown; stack?: string };
    console.error('[Theme Install] Error creating homepage template:', {
      error: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack,
      themeSlug: theme.slug,
      tenantId: tenant.id,
    });
  }

  try {
    const tenantName = tenant.name || 'Store';

    console.log('[Theme Install] ===== STARTING ADDITIONAL PAGES CREATION =====');
    console.log('[Theme Install] Tenant info:', {
      id: tenant.id,
      name: tenant.name,
      tenantName,
      isNewInstall,
    });

    const additionalPageTemplates = getAdditionalPageTemplates(tenantName);

    let contactFormId: string | undefined;
    if (additionalPageTemplates?.some((t) => t.slug === 'contact')) {
      try {
        const existingContactForm = await prisma.form_builders.findFirst({
          where: {
            tenant_id: tenant.id,
            slug: 'contact-form',
          },
        });

        if (!existingContactForm) {
          const contactForm = await prisma.form_builders.create({
            data: {
              tenant_id: tenant.id,
              title: 'Contact Form',
              slug: 'contact-form',
              description: 'Get in touch with us using this form',
              email: tenant.contact_email || null,
              button_text: 'Send Message',
              fields: [
                {
                  id: `field-${Date.now()}-1`,
                  type: 'text',
                  label: 'Name',
                  name: 'name',
                  required: true,
                  placeholder: 'Your full name',
                },
                {
                  id: `field-${Date.now()}-2`,
                  type: 'email',
                  label: 'Email',
                  name: 'email',
                  required: true,
                  placeholder: 'your.email@example.com',
                },
                {
                  id: `field-${Date.now()}-3`,
                  type: 'text',
                  label: 'Subject',
                  name: 'subject',
                  required: true,
                  placeholder: 'What is this regarding?',
                },
                {
                  id: `field-${Date.now()}-4`,
                  type: 'textarea',
                  label: 'Message',
                  name: 'message',
                  required: true,
                  placeholder: 'Tell us how we can help you...',
                },
              ],
              success_message: 'Thank you for your message! We will get back to you soon.',
              status: 'active',
            },
          });
          contactFormId = contactForm.id;
        } else {
          contactFormId = existingContactForm.id;
        }
      } catch (formError: unknown) {
        console.error('[Theme Install] Failed to create contact form:', formError);
      }
    }

    if (additionalPageTemplates && additionalPageTemplates.length > 0) {
      for (const pageConfig of additionalPageTemplates) {
        try {
          const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);

          const existingPage = await prisma.pages.findFirst({
            where: {
              tenant_id: tenant.id,
              slug: pageSlug,
            },
          });

          let pageBuilderData;
          if (pageConfig.slug === 'contact') {
            pageBuilderData = pageConfig.templateGenerator(
              tenantName,
              contactFormId,
              tenant.contact_email || undefined,
            );
          } else {
            pageBuilderData = pageConfig.templateGenerator(tenantName);
          }

          pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

          if (!existingPage) {
            const createdPage = await prisma.pages.create({
              data: {
                tenant_id: tenant.id,
                title: pageConfig.title,
                slug: pageSlug,
                content: JSON.stringify(pageBuilderData),
                status: 'published',
                banner_image: null,
                meta_title: pageConfig.metaTitle || null,
                meta_description: pageConfig.metaDescription || null,
              },
            });
            additionalPagesCreated++;
            console.log('[Theme Install] Additional page created successfully:', {
              id: createdPage.id,
              slug: createdPage.slug,
              title: createdPage.title,
            });
          } else {
            const updatedPage = await prisma.pages.update({
              where: { id: existingPage.id },
              data: {
                title: pageConfig.title,
                content: JSON.stringify(pageBuilderData),
                status: 'published',
                banner_image: existingPage.banner_image?.startsWith('blob:')
                  ? null
                  : existingPage.banner_image,
                meta_title: pageConfig.metaTitle || null,
                meta_description: pageConfig.metaDescription || null,
                updated_at: new Date(),
              },
            });
            additionalPagesCreated++;
            console.log('[Theme Install] Additional page updated successfully:', {
              id: updatedPage.id,
              slug: updatedPage.slug,
              title: updatedPage.title,
            });
          }
        } catch (pageError: unknown) {
          const err = pageError as { message?: string; code?: string; meta?: unknown; stack?: string };
          console.error(`[Theme Install] ERROR creating ${pageConfig.slug} page:`, {
            error: err.message,
            code: err.code,
            meta: err.meta,
            stack: err.stack,
            tenantId: tenant.id,
          });
        }
      }
    }
  } catch (additionalPagesError: unknown) {
    const err = additionalPagesError as {
      message?: string;
      code?: string;
      meta?: unknown;
      stack?: string;
    };
    console.error('[Theme Install] Error in additional pages creation block:', {
      error: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack,
      themeSlug: theme.slug,
      tenantId: tenant.id,
    });
  }

  let demoPagesCreated = 0;
  let demoSalesCreated = 0;
  let demoBlogsCreated = 0;
  let demoBlogCategoriesCreated = 0;
  let demoFormsCreated = 0;

  if (isNewInstall && include_demo_content === true) {
    try {
      const demoResult = await createDemoContent(
        prisma,
        tenant.id,
        business_type || '',
        include_demo_attributes === true,
      );
      demoContentCreated = true;
      demoCategoriesCreated = demoResult.categoriesCreated;
      demoProductsCreated = demoResult.productsCreated;
      demoAttributesCreated = demoResult.attributesCreated;
      demoPagesCreated = demoResult.pagesCreated;
      demoSalesCreated = demoResult.salesCreated;
      demoBlogsCreated = demoResult.blogsCreated;
      demoBlogCategoriesCreated = demoResult.blogCategoriesCreated;
      demoFormsCreated = demoResult.formsCreated;
    } catch (demoError: unknown) {
      const err = demoError as { message?: string; stack?: string };
      console.error('[Theme Install] Error creating demo content:', {
        error: err.message,
        stack: err.stack,
        themeSlug: theme.slug,
        tenantId: tenant.id,
      });
    }
  }

  const installationDuration = Date.now() - startTime;

  await trackThemeInstallation(prisma, request, {
    theme_id: theme.id,
    theme_slug: theme.slug,
    theme_title: theme.title,
    tenant_id: tenant.id,
    is_new_install: isNewInstall,
    homepage_created: homepageCreated,
    additional_pages_created: additionalPagesCreated,
    demo_content_created: demoContentCreated,
    demo_categories_created: demoCategoriesCreated,
    demo_products_created: demoProductsCreated,
    demo_attributes_created: demoAttributesCreated,
    defaults_applied: isNewInstall,
    success: true,
    installation_duration_ms: installationDuration,
  });

  return {
    tenant_theme: tenantTheme,
    homepage_created: homepageCreated,
    additional_pages_created: additionalPagesCreated,
    defaults_applied: isNewInstall,
    demo_content_created: demoContentCreated,
    demo_categories_created: demoCategoriesCreated,
    demo_products_created: demoProductsCreated,
    demo_attributes_created: demoAttributesCreated,
    demo_pages_created: demoPagesCreated,
    demo_sales_created: demoSalesCreated,
    demo_blogs_created: demoBlogsCreated,
    demo_blog_categories_created: demoBlogCategoriesCreated,
    demo_forms_created: demoFormsCreated,
    status: isNewInstall ? 201 : 200,
  };
}

export async function trackFailedThemeInstallation(
  request: NextRequest,
  tenantId: string,
  body: InstallThemeBody,
  errorMessage: string,
  installationDuration: number,
) {
  try {
    const normalized = normalizeInstallThemeBody(body);
    const themeId = normalized.theme_id || 'unknown';
    let themeSlug = 'unknown';
    let themeTitle = 'Unknown Theme';

    if (themeId !== 'unknown') {
      const theme = await prisma.themes.findUnique({
        where: { id: themeId },
        select: { slug: true, title: true },
      });
      if (theme) {
        themeSlug = theme.slug;
        themeTitle = theme.title;
      }
    }

    await trackThemeInstallation(prisma, request, {
      theme_id: themeId,
      theme_slug: themeSlug,
      theme_title: themeTitle,
      tenant_id: tenantId,
      is_new_install: false,
      homepage_created: false,
      additional_pages_created: 0,
      demo_content_created: false,
      demo_categories_created: 0,
      demo_products_created: 0,
      demo_attributes_created: 0,
      defaults_applied: false,
      success: false,
      error_message: errorMessage,
      installation_duration_ms: installationDuration,
    });
  } catch (trackingError) {
    console.error('Error tracking failed installation:', trackingError);
  }
}
