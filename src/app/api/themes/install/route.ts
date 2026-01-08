/**
 * Theme Installation API Route
 * 
 * POST: Install/activate a theme for the current tenant
 * 
 * When installing a new theme, this will:
 * 1. Create/activate tenant_theme record
 * 2. Create homepage template if it doesn't exist
 * 3. Set up page builder sections from theme's layout
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import {
  getHomepageTemplateData,
  getHomepageLayout,
  convertLegacyLayoutToPageBuilder,
  createDefaultHomepageTemplate,
} from '@/lib/themes/homepage-templates';
import { getThemeDefaults } from '@/lib/themes/theme-defaults';
import { getAdditionalPageTemplates } from '@/lib/themes/additional-pages';
import { createDemoContent } from '@/lib/themes/demo-content';
import { trackThemeInstallation } from '@/lib/themes/theme-installation-analytics';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let installationSuccess = false;
  let errorMessage: string | undefined;
  
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const { theme_id, include_demo_content } = body;
    
    console.log('[Theme Install] Installation request:', {
      theme_id,
      include_demo_content,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
    });

    if (!theme_id) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
        { status: 400 }
      );
    }

    // Check if theme exists
    const theme = await prisma.themes.findUnique({
      where: { id: theme_id },
    });

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Deactivate all other themes for this tenant
    await prisma.tenant_themes.updateMany({
      where: {
        tenant_id: tenant.id,
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    // Check if tenant already has this theme
    const existingTenantTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenant.id,
        theme_id: theme_id,
      },
    });

    let tenantTheme;
    let isNewInstall = false;

    if (existingTenantTheme) {
      // Update existing theme to active
      tenantTheme = await prisma.tenant_themes.update({
        where: {
          id: existingTenantTheme.id,
        },
        data: {
          is_active: true,
          updated_at: new Date(),
        },
      });
    } else {
      // Create new tenant theme
      isNewInstall = true;
      
      // Get theme defaults for this theme
      const themeDefaults = getThemeDefaults(theme.slug);
      
      // Create tenant theme with defaults
      tenantTheme = await prisma.tenant_themes.create({
        data: {
          tenant_id: tenant.id,
          theme_id: theme_id,
          is_active: true,
          custom_colors: themeDefaults?.colors || {},
          custom_fonts: themeDefaults?.fonts || {},
        },
      });
    }

    // If this is a new installation, create homepage template and additional pages
    let homepageCreated = false;
    let additionalPagesCreated = 0;
    let demoContentCreated = false;
    let demoCategoriesCreated = 0;
    let demoProductsCreated = 0;
    
    if (isNewInstall) {
      try {
        // Check if homepage already exists
        const existingHomepage = await prisma.pages.findFirst({
          where: {
            tenant_id: tenant.id,
            slug: 'home',
          },
        });

        if (!existingHomepage) {
          // Get homepage template data for this theme
          const templateData = getHomepageTemplateData(theme.slug);
          const layoutData = getHomepageLayout(theme.slug);

          // Determine page title and slug
          const pageTitle = templateData?.title || `Home - ${theme.title}`;
          const pageSlug = 'home';

          // Convert layout to page builder format
          let pageBuilderData;
          if (layoutData && layoutData.length > 0) {
            pageBuilderData = convertLegacyLayoutToPageBuilder(layoutData);
          } else {
            // Use default template if theme-specific one doesn't exist
            pageBuilderData = createDefaultHomepageTemplate(theme.slug, tenant.name);
          }

          // Create homepage page
          const createdHomepage = await prisma.pages.create({
            data: {
              tenant_id: tenant.id,
              title: pageTitle,
              slug: pageSlug,
              content: JSON.stringify(pageBuilderData),
              status: 'published',
              meta_title: `${tenant.name} - Home`,
              meta_description: `Welcome to ${tenant.name}. Shop our amazing products and discover great deals.`,
            },
          });
          homepageCreated = true;
          console.log('[Theme Install] Homepage created:', {
            id: createdHomepage.id,
            slug: createdHomepage.slug,
            title: createdHomepage.title,
            status: createdHomepage.status,
          });
        } else {
          console.log('[Theme Install] Homepage already exists, skipping creation');
        }
      } catch (homepageError) {
        // Log error but don't fail theme installation
        console.error('Error creating homepage template:', homepageError);
        // Continue with theme installation even if homepage creation fails
      }

      // Create additional pages (About, Contact, Shop)
      try {
        const additionalPageTemplates = getAdditionalPageTemplates(tenant.name);
        
        for (const pageConfig of additionalPageTemplates) {
          try {
            // Check if page already exists
            const existingPage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: pageConfig.slug,
              },
            });

            if (!existingPage) {
              // Generate page builder content
              const pageBuilderData = pageConfig.templateGenerator(tenant.name);

              // Create the page
              const createdPage = await prisma.pages.create({
                data: {
                  tenant_id: tenant.id,
                  title: pageConfig.title,
                  slug: pageConfig.slug,
                  content: JSON.stringify(pageBuilderData),
                  status: 'published',
                  meta_title: pageConfig.metaTitle,
                  meta_description: pageConfig.metaDescription,
                },
              });
              additionalPagesCreated++;
              console.log('[Theme Install] Additional page created:', {
                id: createdPage.id,
                slug: createdPage.slug,
                title: createdPage.title,
                status: createdPage.status,
              });
            } else {
              console.log('[Theme Install] Page already exists, skipping:', pageConfig.slug);
            }
          } catch (pageError) {
            // Log error for individual page but continue with others
            console.error(`Error creating ${pageConfig.slug} page:`, pageError);
          }
        }
      } catch (additionalPagesError) {
        // Log error but don't fail theme installation
        console.error('Error creating additional pages:', additionalPagesError);
        // Continue with theme installation even if additional pages creation fails
      }

      // Create demo content if requested
      if (include_demo_content === true) {
        try {
          console.log('[Theme Install] Creating demo content for theme:', theme.slug);
          const demoResult = await createDemoContent(prisma, tenant.id, theme.slug);
          demoContentCreated = true;
          demoCategoriesCreated = demoResult.categoriesCreated;
          demoProductsCreated = demoResult.productsCreated;
          console.log('[Theme Install] Demo content created:', {
            categories: demoCategoriesCreated,
            products: demoProductsCreated,
          });
        } catch (demoError: any) {
          // Log detailed error but don't fail theme installation
          console.error('[Theme Install] Error creating demo content:', {
            error: demoError.message,
            stack: demoError.stack,
            themeSlug: theme.slug,
            tenantId: tenant.id,
          });
          // Continue with theme installation even if demo content creation fails
        }
      } else {
        console.log('[Theme Install] Demo content not requested (include_demo_content:', include_demo_content, ')');
      }
    }

    installationSuccess = true;
    const installationDuration = Date.now() - startTime;

    // Track successful installation
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
      defaults_applied: isNewInstall,
      success: true,
      installation_duration_ms: installationDuration,
    });

    return NextResponse.json(
      { 
        tenant_theme: tenantTheme,
        homepage_created: homepageCreated,
        additional_pages_created: additionalPagesCreated,
        defaults_applied: isNewInstall,
        demo_content_created: demoContentCreated,
        demo_categories_created: demoCategoriesCreated,
        demo_products_created: demoProductsCreated,
      },
      { status: isNewInstall ? 201 : 200 }
    );
  } catch (error: any) {
    console.error('Error installing theme:', error);
    errorMessage = error.message || 'Failed to install theme';
    const installationDuration = Date.now() - startTime;

    // Track failed installation (non-blocking)
    try {
      // Try to get tenant and theme info for tracking
      let tenantId = 'unknown';
      let themeId = 'unknown';
      let themeSlug = 'unknown';
      let themeTitle = 'Unknown Theme';
      
      try {
        const tenant = await requireTenant();
        tenantId = tenant.id;
      } catch {
        // Tenant context might not be available in error state
      }

      try {
        const body = await request.json().catch(() => ({}));
        themeId = body.theme_id || 'unknown';
        
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
      } catch {
        // Ignore errors getting theme info
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
        defaults_applied: false,
        success: false,
        error_message: errorMessage,
        installation_duration_ms: installationDuration,
      });
    } catch (trackingError) {
      // Don't fail if tracking fails
      console.error('Error tracking failed installation:', trackingError);
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

