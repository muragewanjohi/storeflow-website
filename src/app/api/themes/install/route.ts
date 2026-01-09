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
import { generateSlug } from '@/lib/content/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let installationSuccess = false;
  let errorMessage: string | undefined;
  
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const { theme_id, include_demo_content, include_demo_attributes } = body;
    
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

    // Create homepage template and additional pages if they don't exist
    // For new installs: Always create pages
    // For theme switches: Only create if they don't exist
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
    
    // Always try to create pages if they don't exist (for both new installs and switches)
    // Create homepage
    try {
      // Determine page title and slug
      const templateData = getHomepageTemplateData(theme.slug);
      const pageTitle = templateData?.title || `Home - ${theme.title}`;
      const pageSlug = generateSlug('home'); // Use same slug generation as API route

      // Check if homepage already exists for this tenant (matching API route check)
      const existingHomepage = await prisma.pages.findFirst({
        where: {
          tenant_id: tenant.id,
          slug: pageSlug,
        },
      });

      // Get homepage template data for this theme
      const layoutData = getHomepageLayout(theme.slug);

      // Convert layout to page builder format
      let pageBuilderData;
      if (layoutData && layoutData.length > 0) {
        pageBuilderData = convertLegacyLayoutToPageBuilder(layoutData);
      } else {
        // Use default template if theme-specific one doesn't exist
        pageBuilderData = createDefaultHomepageTemplate(theme.slug, tenant.name);
      }

      if (!existingHomepage) {
        // Create homepage page - matching API route structure
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
        console.log('[Theme Install] Homepage created successfully:', {
          id: createdHomepage.id,
          slug: createdHomepage.slug,
          title: createdHomepage.title,
          status: createdHomepage.status,
          tenant_id: createdHomepage.tenant_id,
        });
      } else {
        console.log('[Theme Install] Homepage already exists, updating with new theme content:', {
          slug: pageSlug,
          existingId: existingHomepage.id,
        });
        
        // Update existing homepage with new theme's content
        const updatedHomepage = await prisma.pages.update({
          where: { id: existingHomepage.id },
          data: {
            title: pageTitle,
            content: JSON.stringify(pageBuilderData),
            status: 'published',
            meta_title: `${tenant.name} - Home`,
            meta_description: `Welcome to ${tenant.name}. Shop our amazing products and discover great deals.`,
            updated_at: new Date(),
          },
        });
        homepageCreated = true; // Mark as created/updated
        console.log('[Theme Install] Homepage updated successfully:', {
          id: updatedHomepage.id,
          slug: updatedHomepage.slug,
          title: updatedHomepage.title,
          status: updatedHomepage.status,
        });
      }
    } catch (homepageError: any) {
      // Log detailed error but don't fail theme installation
      console.error('[Theme Install] Error creating homepage template:', {
        error: homepageError.message,
        code: homepageError.code,
        meta: homepageError.meta,
        stack: homepageError.stack,
        themeSlug: theme.slug,
        tenantId: tenant.id,
      });
      // Continue with theme installation even if homepage creation fails
    }

    // Create additional pages (About, Contact, Shop)
    // Always create pages for new installs, or if they don't exist
    try {
      // Ensure tenant.name is available
      const tenantName = tenant.name || 'Store';
      
      console.log('[Theme Install] ===== STARTING ADDITIONAL PAGES CREATION =====');
      console.log('[Theme Install] Tenant info:', {
        id: tenant.id,
        name: tenant.name,
        tenantName: tenantName,
        isNewInstall,
      });
      
      const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
      
      console.log('[Theme Install] getAdditionalPageTemplates returned:', {
        templateCount: additionalPageTemplates?.length || 0,
        templates: additionalPageTemplates?.map(t => ({ slug: t.slug, title: t.title })) || [],
      });
      
      if (!additionalPageTemplates || additionalPageTemplates.length === 0) {
        console.error('[Theme Install] ❌ CRITICAL: No additional page templates returned from getAdditionalPageTemplates!');
        console.error('[Theme Install] This means pages will NOT be created.');
      } else {
        console.log('[Theme Install] ✅ Found', additionalPageTemplates.length, 'page templates to create');
      }
      
      if (additionalPageTemplates && additionalPageTemplates.length > 0) {
        for (const pageConfig of additionalPageTemplates) {
          try {
            console.log('[Theme Install] --- Processing page:', pageConfig.title, '---');
            
            // Generate slug using same method as API route
            const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);
            
            console.log('[Theme Install] Page details:', {
              title: pageConfig.title,
              originalSlug: pageConfig.slug,
              generatedSlug: pageSlug,
            });
            
            // Check if page already exists for this tenant (matching API route check)
            console.log('[Theme Install] Checking if page exists with slug:', pageSlug);
            const existingPage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: pageSlug,
              },
            });

            // Generate page builder content (use tenantName variable)
            console.log('[Theme Install] Generating page builder content...');
            const pageBuilderData = pageConfig.templateGenerator(tenantName);
          
            console.log('[Theme Install] Page builder data generated:', {
              sectionsCount: pageBuilderData.sections?.length || 0,
              hasSections: !!pageBuilderData.sections,
            });

            if (!existingPage) {
              console.log('[Theme Install] ✅ Page does NOT exist, proceeding to create:', pageSlug);
              
              // Create the page - matching API route structure
              console.log('[Theme Install] Creating page in database...');
              const createdPage = await prisma.pages.create({
                data: {
                  tenant_id: tenant.id,
                  title: pageConfig.title,
                  slug: pageSlug,
                  content: JSON.stringify(pageBuilderData),
                  status: 'published',
                  meta_title: pageConfig.metaTitle || null,
                  meta_description: pageConfig.metaDescription || null,
                },
              });
              
              additionalPagesCreated++;
              console.log('[Theme Install] ✅✅✅ Additional page created successfully:', {
                id: createdPage.id,
                slug: createdPage.slug,
                title: createdPage.title,
                status: createdPage.status,
                tenant_id: createdPage.tenant_id,
                totalCreated: additionalPagesCreated,
              });
            } else {
              console.log('[Theme Install] ⚠️  Page already exists, updating with new theme content:', {
                slug: pageSlug,
                existingId: existingPage.id,
                existingTitle: existingPage.title,
              });
              
              // Update existing page with new theme's content
              const updatedPage = await prisma.pages.update({
                where: { id: existingPage.id },
                data: {
                  title: pageConfig.title,
                  content: JSON.stringify(pageBuilderData),
                  status: 'published', // Ensure it's published
                  meta_title: pageConfig.metaTitle || null,
                  meta_description: pageConfig.metaDescription || null,
                  updated_at: new Date(),
                },
              });
              
              additionalPagesCreated++;
              console.log('[Theme Install] ✅✅✅ Additional page updated successfully:', {
                id: updatedPage.id,
                slug: updatedPage.slug,
                title: updatedPage.title,
                status: updatedPage.status,
                totalUpdated: additionalPagesCreated,
              });
            }
          } catch (pageError: any) {
            // Log detailed error for individual page but continue with others
            console.error(`[Theme Install] ❌❌❌ ERROR creating ${pageConfig.slug} page:`, {
              error: pageError.message,
              code: pageError.code,
              meta: pageError.meta,
              stack: pageError.stack,
              pageConfig: {
                title: pageConfig.title,
                slug: pageConfig.slug,
              },
              tenantId: tenant.id,
            });
            // Continue with next page even if this one fails
          }
        }
      } else {
        console.error('[Theme Install] ❌ Cannot create pages - no templates available!');
      }
      
      console.log('[Theme Install] Additional pages creation completed:', {
        attempted: additionalPageTemplates.length,
        created: additionalPagesCreated,
        skipped: additionalPageTemplates.length - additionalPagesCreated,
      });
      
      // If no pages were created, log a warning
      if (additionalPagesCreated === 0) {
        console.warn('[Theme Install] ⚠️  No additional pages were created!', {
          possibleReasons: [
            'Pages may already exist',
            'All pages failed to create',
            'getAdditionalPageTemplates returned empty array',
          ],
          tenantId: tenant.id,
          isNewInstall,
        });
      }
    } catch (additionalPagesError: any) {
      // Log detailed error but don't fail theme installation
      console.error('[Theme Install] ❌ Error in additional pages creation block:', {
        error: additionalPagesError.message,
        code: additionalPagesError.code,
        meta: additionalPagesError.meta,
        stack: additionalPagesError.stack,
        themeSlug: theme.slug,
        tenantId: tenant.id,
      });
      // Continue with theme installation even if additional pages creation fails
    }
    
    // Final summary log
    console.log('[Theme Install] ===== PAGE CREATION SUMMARY =====');
    console.log('[Theme Install] Homepage created:', homepageCreated);
    console.log('[Theme Install] Additional pages created:', additionalPagesCreated);
    console.log('[Theme Install] Is new install:', isNewInstall);
    console.log('[Theme Install] =================================');
    
    // Create demo content if requested (only for new installs to avoid duplicates)
    if (isNewInstall && include_demo_content === true) {
      try {
        console.log('[Theme Install] Creating demo content for theme:', theme.slug, {
          includeAttributes: include_demo_attributes === true,
        });
        const demoResult = await createDemoContent(
          prisma, 
          tenant.id, 
          theme.slug,
          include_demo_attributes === true
        );
        demoContentCreated = true;
        demoCategoriesCreated = demoResult.categoriesCreated;
        demoProductsCreated = demoResult.productsCreated;
        demoAttributesCreated = demoResult.attributesCreated;
        console.log('[Theme Install] Demo content created:', {
          categories: demoCategoriesCreated,
          products: demoProductsCreated,
          attributes: demoAttributesCreated,
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
    } else if (isNewInstall) {
      console.log('[Theme Install] Demo content not requested (include_demo_content:', include_demo_content, ')');
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
      demo_attributes_created: demoAttributesCreated,
      defaults_applied: isNewInstall,
      success: true,
      installation_duration_ms: installationDuration,
    });

    // Final response summary
    const responseData = {
      tenant_theme: tenantTheme,
      homepage_created: homepageCreated,
      additional_pages_created: additionalPagesCreated,
      defaults_applied: isNewInstall,
      demo_content_created: demoContentCreated,
      demo_categories_created: demoCategoriesCreated,
      demo_products_created: demoProductsCreated,
      demo_attributes_created: demoAttributesCreated,
    };
    
    console.log('[Theme Install] ===== FINAL RESPONSE DATA =====');
    console.log('[Theme Install] Response:', JSON.stringify(responseData, null, 2));
    console.log('[Theme Install] ===============================');
    
    return NextResponse.json(
      responseData,
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
        demo_attributes_created: 0,
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

