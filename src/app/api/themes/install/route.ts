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
  getHomepageLayout,
  convertLegacyLayoutToPageBuilder,
  createDefaultHomepageTemplate,
} from '@/lib/themes/homepage-templates';
import { getThemeDefaults, getBusinessTypeColorScheme } from '@/lib/themes/theme-defaults';
import { getAdditionalPageTemplates } from '@/lib/themes/additional-pages';
import { createDemoContent } from '@/lib/themes/demo-content';
import { trackThemeInstallation } from '@/lib/themes/theme-installation-analytics';
import { generateSlug } from '@/lib/content/validation';

export const dynamic = 'force-dynamic';

/**
 * Remove blob URLs from page builder content
 * This ensures no temporary blob URLs are saved to the database
 */
function cleanBlobUrlsFromPageBuilder(pageBuilderData: any): any {
  if (!pageBuilderData || !pageBuilderData.sections) {
    return pageBuilderData;
  }

  const cleanedSections = pageBuilderData.sections.map((section: any) => {
    const cleaned = { ...section };

    // Remove blob URLs from hero section images
    if (cleaned.type === 'hero' && cleaned.image && cleaned.image.startsWith('blob:')) {
      console.warn('[Theme Install] Removing blob URL from hero section image:', cleaned.image);
      delete cleaned.image;
    }

    // Remove blob URLs from image section
    if (cleaned.type === 'image' && cleaned.image && cleaned.image.startsWith('blob:')) {
      console.warn('[Theme Install] Removing blob URL from image section:', cleaned.image);
      delete cleaned.image;
    }

    // Remove blob URLs from features section images
    if (cleaned.type === 'features' && cleaned.features) {
      cleaned.features = cleaned.features.map((feature: any) => {
        if (feature.image && feature.image.startsWith('blob:')) {
          console.warn('[Theme Install] Removing blob URL from feature image:', feature.image);
          delete feature.image;
        }
        return feature;
      });
    }

    // Remove blob URLs from testimonials section images
    if (cleaned.type === 'testimonials' && cleaned.testimonials) {
      cleaned.testimonials = cleaned.testimonials.map((testimonial: any) => {
        if (testimonial.image && testimonial.image.startsWith('blob:')) {
          console.warn('[Theme Install] Removing blob URL from testimonial image:', testimonial.image);
          delete testimonial.image;
        }
        return testimonial;
      });
    }

    return cleaned;
  });

  return {
    ...pageBuilderData,
    sections: cleanedSections,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let installationSuccess = false;
  let errorMessage: string | undefined;
  
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const { theme_id, include_demo_content, include_demo_attributes, business_type } = body;
    
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
      // Also update colors if business type is provided (allows color refresh)
      const updateData: any = {
        is_active: true,
        updated_at: new Date(),
      };
      
      // If business type is provided, update colors with latest scheme
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
      // Create new tenant theme
      isNewInstall = true;
      
      // Get theme defaults for this theme
      const themeDefaults = getThemeDefaults(theme.slug);
      
      // Get business type color scheme if provided
      let finalColors = themeDefaults?.colors || {};
      if (business_type) {
        const businessColors = getBusinessTypeColorScheme(business_type);
        if (businessColors) {
          // Merge business type colors with theme defaults (business type takes precedence)
          finalColors = { ...finalColors, ...businessColors };
        }
      }
      
      // Create tenant theme with defaults and business type colors
      tenantTheme = await prisma.tenant_themes.create({
        data: {
          tenant_id: tenant.id,
          theme_id: theme_id,
          is_active: true,
          custom_colors: finalColors,
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
      // Homepage always uses slug 'home' and title 'Home' for display in dashboard/navigation
      const pageTitle = 'Home';
      const pageSlug = generateSlug('home'); // 'home'

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

      // Clean any blob URLs from page builder content
      pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

      if (!existingHomepage) {
        // Create homepage page - matching API route structure
        const createdHomepage = await prisma.pages.create({
          data: {
            tenant_id: tenant.id,
            title: pageTitle,
            slug: pageSlug,
            content: JSON.stringify(pageBuilderData),
            status: 'published',
            banner_image: null, // Explicitly set to null to prevent blob URLs
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
            banner_image: existingHomepage.banner_image?.startsWith('blob:') ? null : existingHomepage.banner_image, // Remove blob URLs if present
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
      
      // Get or create contact form for contact page
      let contactFormId: string | undefined;
      if (additionalPageTemplates?.some(t => t.slug === 'contact')) {
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
            console.log('[Theme Install] ✅ Created contact form (ID: ' + contactFormId + ')');
          } else {
            contactFormId = existingContactForm.id;
            console.log('[Theme Install] ℹ️ Contact form already exists (ID: ' + contactFormId + ')');
          }
        } catch (formError: any) {
          console.error('[Theme Install] ❌ Failed to create contact form:', formError);
        }
      }
      
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
            // For contact page, pass the contact form ID and contact email
            console.log('[Theme Install] Generating page builder content...');
            let pageBuilderData;
            if (pageConfig.slug === 'contact') {
              pageBuilderData = pageConfig.templateGenerator(tenantName, contactFormId, tenant.contact_email || undefined);
            } else {
              pageBuilderData = pageConfig.templateGenerator(tenantName);
            }
          
            // Clean any blob URLs from page builder content
            pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);
          
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
                  banner_image: null, // Explicitly set to null to prevent blob URLs
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
                  banner_image: existingPage.banner_image?.startsWith('blob:') ? null : existingPage.banner_image, // Remove blob URLs if present
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
    let demoPagesCreated = 0;
    let demoSalesCreated = 0;
    let demoBlogsCreated = 0;
    let demoBlogCategoriesCreated = 0;
    let demoFormsCreated = 0;

    if (isNewInstall && include_demo_content === true) {
      try {
        console.log('[Theme Install] Creating demo content for business type:', business_type, {
          includeAttributes: include_demo_attributes === true,
        });
        const demoResult = await createDemoContent(
          prisma, 
          tenant.id, 
          business_type || '',
          include_demo_attributes === true
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
        console.log('[Theme Install] Demo content created:', {
          categories: demoCategoriesCreated,
          products: demoProductsCreated,
          attributes: demoAttributesCreated,
          pages: demoPagesCreated,
          sales: demoSalesCreated,
          blogs: demoBlogsCreated,
          blogCategories: demoBlogCategoriesCreated,
          forms: demoFormsCreated,
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
      demo_pages_created: demoPagesCreated,
      demo_sales_created: demoSalesCreated,
      demo_blogs_created: demoBlogsCreated,
      demo_blog_categories_created: demoBlogCategoriesCreated,
      demo_forms_created: demoFormsCreated,
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

