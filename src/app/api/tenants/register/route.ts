/**
 * Public Tenant Registration API Route
 * 
 * POST /api/tenants/register
 * 
 * Allows public users to register a new tenant (no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSubdomain } from '@/lib/subdomain-validation';
import { sendEmail } from '@/lib/email/sendgrid';
import { detectUserLocation, getLocalizedPrice } from '@/lib/pricing/location';
import { getCurrencyForCountry } from '@/lib/pricing/country-currency-map';
import { setStaticOptions } from '@/lib/settings/static-options';
import { addTenantDomain } from '@/lib/vercel-domains';
import { clearCachedTenant } from '@/lib/tenant-context/cache';
import { z } from 'zod';
import {
  getHomepageLayout,
  convertLegacyLayoutToPageBuilder,
  createDefaultHomepageTemplate,
} from '@/lib/themes/homepage-templates';
import { getThemeDefaults, getBusinessTypeColorScheme } from '@/lib/themes/theme-defaults';
import { getAdditionalPageTemplates } from '@/lib/themes/additional-pages';
import { createDemoContent } from '@/lib/themes/demo-content';
import { generateSlug } from '@/lib/content/validation';

/**
 * Remove blob URLs from page builder content
 */
function cleanBlobUrlsFromPageBuilder(pageBuilderData: any): any {
  if (!pageBuilderData || !pageBuilderData.sections) {
    return pageBuilderData;
  }

  const cleanedSections = pageBuilderData.sections.map((section: any) => {
    const cleaned = { ...section };

    if (cleaned.type === 'hero' && cleaned.image && cleaned.image.startsWith('blob:')) {
      delete cleaned.image;
    }

    if (cleaned.type === 'image' && cleaned.image && cleaned.image.startsWith('blob:')) {
      delete cleaned.image;
    }

    if (cleaned.type === 'features' && cleaned.features) {
      cleaned.features = cleaned.features.map((feature: any) => {
        if (feature.image && feature.image.startsWith('blob:')) {
          delete feature.image;
        }
        return feature;
      });
    }

    if (cleaned.type === 'testimonials' && cleaned.testimonials) {
      cleaned.testimonials = cleaned.testimonials.map((testimonial: any) => {
        if (testimonial.image && testimonial.image.startsWith('blob:')) {
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

const registerTenantSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminName: z.string().min(1, 'Admin name is required'),
  contactEmail: z.string().email('Invalid contact email address').optional(),
  planId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
  businessType: z.string().optional(),
  includeDemoContent: z.boolean().optional(),
  includeDemoAttributes: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerTenantSchema.parse(body);

    // Detect user location for pricing - check client-provided headers first, then server headers
    let locationInfo = detectUserLocation(request.headers);
    
    // Check if client provided location info (from client-side detection)
    const clientCountry = request.headers.get('x-user-country');
    const clientCurrency = request.headers.get('x-user-currency');
    
    if (clientCountry === 'KE' || clientCurrency === 'KES') {
      locationInfo = {
        currency: 'KES',
        currencySymbol: 'Ksh',
        isKenya: true,
        countryCode: 'KE',
      };
    } else if (clientCountry && clientCountry !== 'KE') {
      locationInfo = {
        currency: 'USD',
        currencySymbol: '$',
        isKenya: false,
        countryCode: clientCountry,
      };
    }
    
    // Get country code for storage (prioritize detected country code)
    const countryCode = locationInfo.countryCode || 
                       clientCountry || 
                       request.headers.get('x-vercel-ip-country') ||
                       request.headers.get('cf-ipcountry') ||
                       null;

    // Validate subdomain
    const subdomainValidation = validateSubdomain(validatedData.subdomain);
    if (!subdomainValidation.isValid) {
      return NextResponse.json(
        { message: subdomainValidation.error },
        { status: 400 }
      );
    }

    // Check if subdomain already exists - SIMPLIFIED: Only check subdomain
    const existingTenant = await prisma.tenants.findUnique({
      where: { subdomain: validatedData.subdomain },
    });

    if (existingTenant) {
      return NextResponse.json(
        {
          message: 'This subdomain is already taken. Please choose another.',
          errors: [{ field: 'subdomain', message: 'Subdomain taken — choose another' }],
        },
        { status: 409 }
      );
    }

    // Verify plan exists if provided
    let plan = null;
    if (validatedData.planId) {
      plan = await prisma.price_plans.findUnique({
        where: { id: validatedData.planId },
      });

      if (!plan || plan.status !== 'active') {
        return NextResponse.json(
          { message: 'Selected pricing plan is not available' },
          { status: 400 }
        );
      }
    }

    // Calculate expiration date
    let expireDate: Date | null = null;
    if (plan) {
      expireDate = new Date();
      if (plan.trial_days && plan.trial_days > 0) {
        expireDate.setDate(expireDate.getDate() + plan.trial_days);
      } else {
        expireDate.setMonth(expireDate.getMonth() + plan.duration_months);
      }
    }

    // Check if user with this email already exists in Supabase Auth
    // If user exists, use existing user_id; if not, create new user
    const adminClient = createAdminClient();
    let existingUser = null;
    const maxPagesToSearch = 5;
    const perPage = 1000;
    
    for (let page = 1; page <= maxPagesToSearch; page++) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (listError) {
        console.error('Error listing users:', listError);
        // Continue with user creation if listing fails
        break;
      }
      
      // Find user by email (case-insensitive)
      existingUser = users.find(user => 
        user.email?.toLowerCase() === validatedData.adminEmail.toLowerCase()
      );
      
      if (existingUser) {
        break;
      }
      
      // If no more users, user doesn't exist
      if (users.length === 0 || users.length < perPage) {
        break;
      }
    }

    // Get plan details if plan is selected
    let subscriptionPrice: number | null = null;
    let subscriptionCurrency: 'KES' | 'USD' = 'USD';
    let subscriptionCurrencySymbol: 'Ksh' | '$' = '$';
    
    if (validatedData.planId && plan) {
      // Get localized price based on location
      subscriptionPrice = getLocalizedPrice(plan.name, locationInfo.isKenya);
      subscriptionCurrency = locationInfo.currency;
      subscriptionCurrencySymbol = locationInfo.currencySymbol;
    }

    // Create tenant in database
    const tenant = await prisma.tenants.create({
      data: {
        name: validatedData.name,
        subdomain: validatedData.subdomain,
        contact_email: validatedData.contactEmail ?? validatedData.adminEmail,
        status: 'active',
        start_date: new Date(),
        plan_id: validatedData.planId || null,
        expire_date: expireDate,
        country: countryCode, // Store country code
        data: {
          theme: 'light',
          // Store subscription pricing info for future payments
          subscription: validatedData.planId ? {
            currency: subscriptionCurrency,
            currencySymbol: subscriptionCurrencySymbol,
            price: subscriptionPrice,
            planName: plan?.name || null,
          } : null,
        },
      },
    });

    let userId: string;
    
    // If user exists, use existing user_id; otherwise create new user
    if (existingUser) {
      userId = existingUser.id;
      
      // Update tenant with existing user_id
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          user_id: userId,
        },
      });

      // Update user metadata to include the new tenant_id
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          tenant_id: tenant.id,
          name: validatedData.adminName,
          role: 'tenant_admin',
        },
      }).catch((error) => {
        console.error('Failed to update user metadata:', error);
      });
    } else {
      // Create new user in Supabase Auth
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: validatedData.adminEmail,
        password: validatedData.adminPassword,
        email_confirm: true,
        user_metadata: {
          role: 'tenant_admin',
          tenant_id: tenant.id,
          name: validatedData.adminName,
        },
      });

      if (authError || !authUser) {
        // Rollback: delete tenant if user creation fails
        await prisma.tenants.delete({
          where: { id: tenant.id },
        });

        return NextResponse.json(
          { message: `Failed to create admin user: ${authError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      userId = authUser.user.id;
      
      // Update tenant with user_id
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          user_id: userId,
        },
      });
    }

    // Initialize store currency settings based on detected country
    try {
      const currencyInfo = getCurrencyForCountry(countryCode);
      await setStaticOptions(tenant.id, {
        currency_code: currencyInfo.code,
        currency_symbol: currencyInfo.symbol,
        currency_symbol_position: currencyInfo.symbolPosition,
        currency_thousand_separator: currencyInfo.thousandSeparator,
        currency_decimal_separator: currencyInfo.decimalSeparator,
        currency_decimal_places: String(currencyInfo.decimalPlaces),
      });
      console.log(`[Registration] ✅ Initialized currency settings: ${currencyInfo.code} (${currencyInfo.symbol}) for country ${countryCode}`);
    } catch (currencyError) {
      console.error(`[Registration] ⚠️ Failed to initialize currency settings:`, currencyError);
      // Non-critical - store can still function with default USD
    }

    // Generate login URL with subdomain format
    let loginUrl: string;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    
    if (isLocalhost) {
      const url = new URL(baseUrl);
      loginUrl = `${url.protocol}//${tenant.subdomain}.${url.hostname}${url.port ? `:${url.port}` : ''}/dashboard/login`;
    } else {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      loginUrl = `https://${tenant.subdomain}.${baseDomain}/dashboard/login`;
    }

    // Automatically add subdomain to Vercel
    // IMPORTANT: We await this to ensure domain is added before user tries to access it
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (projectId && !isLocalhost) {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      const subdomainUrl = `${tenant.subdomain}.${baseDomain}`;
      try {
        await addTenantDomain(subdomainUrl, projectId);
        console.log(`✅ Successfully added subdomain ${subdomainUrl} to Vercel`);
      } catch (error: any) {
        // Log error but don't fail tenant creation
        // Subdomain can be added manually later if needed
        console.error(`⚠️ Failed to add subdomain ${subdomainUrl} to Vercel:`, error?.message || error);
        // Continue - tenant is still created, just domain needs manual addition
      }
    } else if (!projectId && !isLocalhost) {
      console.warn('VERCEL_PROJECT_ID not set. Subdomain will not be added to Vercel automatically.');
    }

    // Clear any cached tenant data to ensure fresh lookup
    // This is important because the tenant was just created
    try {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      const subdomainHostname = `${tenant.subdomain}.${baseDomain}`;
      await clearCachedTenant(subdomainHostname);
      // Also clear by subdomain alone (in case it was cached differently)
      await clearCachedTenant(tenant.subdomain);
    } catch (cacheError) {
      // Non-critical - cache clear failure shouldn't block registration
      console.warn('Failed to clear tenant cache:', cacheError);
    }

    // Track demo content creation for response
    let demoContentCreated = false;
    let demoProductsCreated = 0;
    let demoCategoriesCreated = 0;

    // Install theme if provided
    if (validatedData.themeId) {
      try {
        console.log(`[Registration] Starting theme installation for tenant ${tenant.subdomain}`, {
          themeId: validatedData.themeId,
          businessType: validatedData.businessType,
          includeDemoContent: validatedData.includeDemoContent,
        });

        const theme = await prisma.themes.findUnique({
          where: { id: validatedData.themeId },
        });

        if (!theme) {
          console.error(`[Registration] Theme not found: ${validatedData.themeId}`);
          throw new Error(`Theme not found: ${validatedData.themeId}`);
        }

        console.log(`[Registration] Found theme: ${theme.slug} (${theme.title})`);

        // Get theme defaults
        const themeDefaults = getThemeDefaults(theme.slug);
        
        // Get business type color scheme if provided
        let finalColors = themeDefaults?.colors || {};
        if (validatedData.businessType) {
          const businessColors = getBusinessTypeColorScheme(validatedData.businessType);
          if (businessColors) {
            finalColors = { ...finalColors, ...businessColors };
          }
        }

        // Create tenant theme
        try {
          await prisma.tenant_themes.create({
            data: {
              tenant_id: tenant.id,
              theme_id: theme.id,
              is_active: true,
              custom_colors: finalColors,
              custom_fonts: themeDefaults?.fonts || {},
            },
          });
          console.log(`[Registration] ✅ Created tenant theme for ${theme.slug}`);
        } catch (themeCreateError: any) {
          console.error(`[Registration] ❌ Failed to create tenant theme:`, themeCreateError);
          throw themeCreateError;
        }

        // Create homepage
        try {
          // Slug is unique per tenant (tenant_id + slug), so we always use 'home' for the homepage
          const pageSlug = 'home';
          console.log(`[Registration] Checking for existing homepage with slug: ${pageSlug} for tenant: ${tenant.id}`);
          const existingHomepage = await prisma.pages.findFirst({
            where: {
              tenant_id: tenant.id,
              slug: pageSlug,
            },
          });

          if (!existingHomepage) {
            console.log(`[Registration] Homepage does not exist, creating now...`);
            const layoutData = getHomepageLayout(theme.slug);
            const pageTitle = 'Home';

            let pageBuilderData;
            if (layoutData && layoutData.length > 0) {
              console.log(`[Registration] Using legacy layout data for homepage`);
              pageBuilderData = convertLegacyLayoutToPageBuilder(layoutData);
            } else {
              console.log(`[Registration] Using default homepage template with businessType: ${validatedData.businessType || 'none'}`);
              pageBuilderData = createDefaultHomepageTemplate(theme.slug, tenant.name, validatedData.businessType || undefined);
            }

            pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);
            console.log(`[Registration] Homepage data prepared, creating in database...`);

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
            console.log(`[Registration] ✅ Created homepage successfully:`, {
              id: createdHomepage.id,
              slug: createdHomepage.slug,
              title: createdHomepage.title,
              tenant_id: createdHomepage.tenant_id,
            });
            
            // Verify the page was actually saved by querying it back
            const verifyHomepage = await prisma.pages.findUnique({
              where: { id: createdHomepage.id },
              select: { id: true, slug: true, tenant_id: true, title: true },
            });
            if (verifyHomepage) {
              console.log(`[Registration] ✅ Verified homepage exists in database:`, verifyHomepage);
            } else {
              console.error(`[Registration] ❌ WARNING: Homepage was created but cannot be found in database!`);
            }
          } else {
            console.log(`[Registration] ℹ️ Homepage already exists (slug: ${pageSlug}, id: ${existingHomepage.id})`);
          }
        } catch (homepageError: any) {
          console.error(`[Registration] ❌ Failed to create homepage:`, homepageError);
          console.error(`[Registration] Homepage error details:`, {
            message: homepageError.message,
            stack: homepageError.stack,
            code: homepageError.code,
          });
          // Continue - pages are important but not critical for registration
        }

        // Create contact form (always created, not just with demo content)
        let contactFormId: string | undefined;
        try {
          console.log(`[Registration] Creating contact form...`);
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
            console.log(`[Registration] ✅ Created contact form (ID: ${contactFormId})`);
          } else {
            contactFormId = existingContactForm.id;
            console.log(`[Registration] ℹ️ Contact form already exists (ID: ${contactFormId})`);
          }
        } catch (formError: any) {
          console.error(`[Registration] ❌ Failed to create contact form:`, formError);
          // Continue - form creation failure shouldn't block page creation
        }

        // Always create /home, /about, and /contact pages (not /about-us or /contact-us)
        try {
          const tenantName = tenant.name || 'Store';
          const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
          
          // Filter to only include about and contact pages (home is already created above)
          const requiredPages = additionalPageTemplates.filter(
            (page) => page.slug === 'about' || page.slug === 'contact'
          );

          console.log(`[Registration] Creating ${requiredPages.length} additional pages (about, contact)`);

          for (const pageConfig of requiredPages) {
            try {
              const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);
              console.log(`[Registration] Checking for existing page: ${pageConfig.title} (slug: ${pageSlug})`);
              const existingPage = await prisma.pages.findFirst({
                where: {
                  tenant_id: tenant.id,
                  slug: pageSlug,
                },
              });

              if (!existingPage) {
                console.log(`[Registration] Page does not exist, creating: ${pageConfig.title}`);
                // For contact page, pass the contact form ID and contact email
                let pageBuilderData;
                if (pageConfig.slug === 'contact') {
                  console.log(`[Registration] Generating contact page template with form ID: ${contactFormId || 'none'}`);
                  pageBuilderData = pageConfig.templateGenerator(tenantName, contactFormId, tenant.contact_email || undefined);
                } else {
                  pageBuilderData = pageConfig.templateGenerator(tenantName);
                }
                pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

                // Handle global unique constraint on slug
                let createdPage;
                try {
                  // Check if slug exists globally (for any tenant)
                  const globalPageCheck = await prisma.pages.findFirst({
                    where: {
                      slug: pageSlug,
                    },
                    select: {
                      id: true,
                      tenant_id: true,
                    },
                  });

                  if (globalPageCheck && globalPageCheck.tenant_id !== tenant.id) {
                    // Slug exists for another tenant - this is a schema issue
                    // Log error but don't create page with wrong slug
                    console.error(`[Registration] ❌ CRITICAL: Slug '${pageSlug}' already exists for tenant ${globalPageCheck.tenant_id}. Database schema needs @@unique([tenant_id, slug]) constraint.`);
                    throw new Error(`Slug '${pageSlug}' is already in use by another tenant. This indicates a database schema issue - the slug constraint should be per-tenant, not global.`);
                  }

                  // Create the page
                  createdPage = await prisma.pages.create({
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
                } catch (createError: any) {
                  // If creation fails due to unique constraint, log detailed error
                  if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
                    console.error(`[Registration] ❌ CRITICAL: Unique constraint violation on slug '${pageSlug}'. This indicates the database schema has a global unique constraint on slug instead of per-tenant.`);
                    console.error(`[Registration] Schema should have: @@unique([tenant_id, slug]) instead of: slug @unique`);
                    throw new Error(`Cannot create page with slug '${pageSlug}' - it already exists for another tenant. Database schema needs to be fixed to allow per-tenant unique slugs.`);
                  }
                  throw createError;
                }
                console.log(`[Registration] ✅ Created page successfully:`, {
                  id: createdPage.id,
                  slug: createdPage.slug,
                  title: createdPage.title,
                  tenant_id: createdPage.tenant_id,
                });
                
                // Verify the page was actually saved
                const verifyPage = await prisma.pages.findUnique({
                  where: { id: createdPage.id },
                  select: { id: true, slug: true, tenant_id: true, title: true },
                });
                if (verifyPage) {
                  console.log(`[Registration] ✅ Verified page exists in database:`, verifyPage);
                } else {
                  console.error(`[Registration] ❌ WARNING: Page was created but cannot be found in database!`);
                }
              } else {
                console.log(`[Registration] ℹ️ Page already exists: ${pageConfig.title} (slug: ${pageSlug}, id: ${existingPage.id})`);
              }
            } catch (pageError: any) {
              console.error(`[Registration] ❌ Failed to create page ${pageConfig.title}:`, pageError);
              console.error(`[Registration] Page error details:`, {
                message: pageError.message,
                stack: pageError.stack,
                code: pageError.code,
              });
              // Continue with next page
            }
          }
        } catch (pagesError: any) {
          console.error(`[Registration] ❌ Failed to create additional pages:`, pagesError);
          // Continue - pages are important but not critical for registration
        }

        // Create demo content if requested
        if (validatedData.includeDemoContent) {
          try {
            console.log(`[Registration] Creating demo content...`, {
              businessType: validatedData.businessType || 'Grocery Store / Supermarket',
              includeAttributes: validatedData.includeDemoAttributes || false,
            });
            const demoResult = await createDemoContent(
              prisma,
              tenant.id,
              validatedData.businessType || 'Grocery Store / Supermarket',
              validatedData.includeDemoAttributes || false
            );
            demoContentCreated = true;
            demoProductsCreated = demoResult.productsCreated;
            demoCategoriesCreated = demoResult.categoriesCreated;
            console.log(`[Registration] ✅ Demo content created:`, {
              products: demoProductsCreated,
              categories: demoCategoriesCreated,
              attributes: demoResult.attributesCreated,
              pages: demoResult.pagesCreated,
            });
          } catch (demoError: any) {
            console.error(`[Registration] ❌ Failed to create demo content:`, demoError);
            console.error(`[Registration] Demo content error details:`, {
              message: demoError.message,
              stack: demoError.stack,
            });
            // Non-critical - continue even if demo content fails
          }
        } else {
          console.log(`[Registration] Demo content not requested (includeDemoContent: false)`);
        }

        console.log(`[Registration] ✅ Successfully installed theme ${theme.slug} for tenant ${tenant.subdomain}`);
        
        // Double-check that required pages exist (in case they weren't created during theme installation)
        try {
          console.log(`[Registration] Verifying required pages exist...`);
          const tenantName = tenant.name || 'Store';
          const requiredSlugs = ['home', 'about', 'contact'];
          
          for (const slug of requiredSlugs) {
            const pageSlug = generateSlug(slug);
            const existingPage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: pageSlug,
              },
            });
            
            if (!existingPage) {
              console.log(`[Registration] ⚠️ Required page missing: ${slug}, creating now...`);
              
              if (slug === 'home') {
                // Create homepage
                const homePageBuilderData = createDefaultHomepageTemplate(theme.slug, tenantName, validatedData.businessType || undefined);
                const cleanedHomePageData = cleanBlobUrlsFromPageBuilder(homePageBuilderData);
                
                await prisma.pages.create({
                  data: {
                    tenant_id: tenant.id,
                    title: 'Home',
                    slug: pageSlug,
                    content: JSON.stringify(cleanedHomePageData),
                    status: 'published',
                    banner_image: null,
                    meta_title: `${tenantName} - Home`,
                    meta_description: `Welcome to ${tenantName}. Shop our amazing products and discover great deals.`,
                  },
                });
                console.log(`[Registration] ✅ Created missing homepage (slug: ${pageSlug})`);
              } else {
                // Create about or contact page
                const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
                const pageConfig = additionalPageTemplates.find(p => p.slug === slug);
                
                if (pageConfig) {
                  let pageBuilderData;
                  if (slug === 'contact') {
                    // Get or create contact form
                    let contactFormId: string | undefined;
                    const existingContactForm = await prisma.form_builders.findFirst({
                      where: {
                        tenant_id: tenant.id,
                        slug: 'contact-form',
                      },
                    });
                    if (existingContactForm) {
                      contactFormId = existingContactForm.id;
                    }
                    pageBuilderData = pageConfig.templateGenerator(tenantName, contactFormId, tenant.contact_email || undefined);
                  } else {
                    pageBuilderData = pageConfig.templateGenerator(tenantName);
                  }
                  pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);
                  
                  await prisma.pages.create({
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
                  console.log(`[Registration] ✅ Created missing page: ${pageConfig.title} (slug: ${pageSlug})`);
                }
              }
            }
          }
        } catch (verifyError: any) {
          console.error(`[Registration] ❌ Error verifying/creating required pages:`, verifyError);
          // Don't throw - registration should still succeed
        }
      } catch (themeError: any) {
        console.error(`[Registration] ❌ Failed to install theme:`, themeError);
        console.error(`[Registration] Theme installation error details:`, {
          message: themeError.message,
          stack: themeError.stack,
          themeId: validatedData.themeId,
        });
        // Non-critical - theme installation failure shouldn't block registration
        // But try to create default pages anyway
        try {
          console.log(`[Registration] Attempting to create default pages after theme installation failure...`);
          
          // Create contact form for fallback pages
          let fallbackContactFormId: string | undefined;
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
              fallbackContactFormId = contactForm.id;
            } else {
              fallbackContactFormId = existingContactForm.id;
            }
          } catch (formError) {
            console.error(`[Registration] ❌ Failed to create fallback contact form:`, formError);
          }
          
          const tenantName = tenant.name || 'Store';
          
          // Create homepage first
          try {
            const homePageSlug = generateSlug('home');
            const existingHomepage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: homePageSlug,
              },
            });

            if (!existingHomepage) {
              const homePageBuilderData = createDefaultHomepageTemplate('grocery', tenantName, validatedData.businessType || undefined);
              const cleanedHomePageData = cleanBlobUrlsFromPageBuilder(homePageBuilderData);

              await prisma.pages.create({
                data: {
                  tenant_id: tenant.id,
                  title: 'Home',
                  slug: homePageSlug,
                  content: JSON.stringify(cleanedHomePageData),
                  status: 'published',
                  banner_image: null,
                  meta_title: `${tenantName} - Home`,
                  meta_description: `Welcome to ${tenantName}. Shop our amazing products and discover great deals.`,
                },
              });
              console.log(`[Registration] ✅ Created fallback homepage (slug: ${homePageSlug})`);
            }
          } catch (homeError: any) {
            console.error(`[Registration] ❌ Failed to create fallback homepage:`, homeError);
          }
          
          // Create about and contact pages
          const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
          const requiredPages = additionalPageTemplates.filter(
            (page) => page.slug === 'about' || page.slug === 'contact'
          );

          for (const pageConfig of requiredPages) {
            try {
              const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);
              const existingPage = await prisma.pages.findFirst({
                where: {
                  tenant_id: tenant.id,
                  slug: pageSlug,
                },
              });

              if (!existingPage) {
                // For contact page, pass the contact form ID and contact email
                let pageBuilderData;
                if (pageConfig.slug === 'contact') {
                  pageBuilderData = pageConfig.templateGenerator(tenantName, fallbackContactFormId, tenant.contact_email || undefined);
                } else {
                  pageBuilderData = pageConfig.templateGenerator(tenantName);
                }
                pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

                await prisma.pages.create({
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
                console.log(`[Registration] ✅ Created fallback page: ${pageConfig.title} (slug: ${pageSlug})`);
              }
            } catch (pageError: any) {
              console.error(`[Registration] ❌ Failed to create fallback page ${pageConfig.title}:`, pageError);
            }
          }
        } catch (fallbackError: any) {
          console.error(`[Registration] ❌ Failed to create fallback pages:`, fallbackError);
        }
      }
    } else {
      // Create a default homepage if no theme is selected
      try {
        const existingHomepage = await prisma.pages.findFirst({
          where: {
            tenant_id: tenant.id,
            slug: 'home',
          },
        });

        if (!existingHomepage) {
          await prisma.pages.create({
            data: {
              tenant_id: tenant.id,
              title: 'Home',
              slug: 'home',
              content: JSON.stringify({
                sections: [
                  {
                    id: 'hero-1',
                    type: 'hero',
                    title: `Welcome to ${tenant.name}`,
                    subtitle: 'Discover amazing products at great prices',
                    ctaText: 'Shop Now',
                    ctaLink: '/shop',
                    layout: 'center',
                  },
                  {
                    id: 'featured-1',
                    type: 'featured-products',
                    title: 'Featured Products',
                    subtitle: 'Check out our top picks',
                    limit: 8,
                  },
                ],
              }),
              status: 'published',
              meta_title: `${tenant.name} - Home`,
              meta_description: `Welcome to ${tenant.name}. Discover amazing products and great deals.`,
            },
          });

          // Create contact form for pages (even without theme)
          let noThemeContactFormId: string | undefined;
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
              noThemeContactFormId = contactForm.id;
            } else {
              noThemeContactFormId = existingContactForm.id;
            }
          } catch (formError) {
            console.error(`[Registration] ❌ Failed to create contact form:`, formError);
          }

          // Always create /about and /contact pages even without theme
          const tenantName = tenant.name || 'Store';
          const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
          const requiredPages = additionalPageTemplates.filter(
            (page) => page.slug === 'about' || page.slug === 'contact'
          );

          for (const pageConfig of requiredPages) {
            const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);
            const existingPage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: pageSlug,
              },
            });

            if (!existingPage) {
              // For contact page, pass the contact form ID and contact email
              let pageBuilderData;
              if (pageConfig.slug === 'contact') {
                pageBuilderData = pageConfig.templateGenerator(tenantName, noThemeContactFormId, tenant.contact_email || undefined);
              } else {
                pageBuilderData = pageConfig.templateGenerator(tenantName);
              }
              pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

              await prisma.pages.create({
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
            }
          }

          console.log(`✅ Created default homepage and pages for tenant ${tenant.subdomain}`);
        }
      } catch (homepageError) {
        console.warn('Failed to create default homepage:', homepageError);
      }
    }

    // Send Day 1 onboarding email (non-blocking)
    const { sendTenantOnboardingEmail } = await import('@/lib/onboarding/emails');
    void sendTenantOnboardingEmail({
      to: validatedData.adminEmail,
      tenantId: tenant.id,
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        custom_domain: tenant.custom_domain,
      },
      stage: 'day1',
    })
      .then(async () => {
        try {
          const tenantData = (tenant.data as any) || {};
          const onboardingEmails = tenantData.onboarding_emails || {};
          await prisma.tenants.update({
            where: { id: tenant.id },
            data: {
              data: {
                ...tenantData,
                onboarding_emails: {
                  ...onboardingEmails,
                  onboarding_started_at: onboardingEmails.onboarding_started_at || new Date().toISOString(),
                  day1_sent_at: new Date().toISOString(),
                },
              },
            },
          });
        } catch (updateError) {
          console.error('[Registration] Failed to persist onboarding email metadata:', updateError);
        }
      })
      .catch((error) => {
        console.error('[Registration] Failed to send Day 1 onboarding email:', error);
      });

    // Return success response
    // Final verification: Ensure all required pages exist before returning success
    try {
      console.log(`[Registration] Performing final verification of required pages...`);
      const tenantName = tenant.name || 'Store';
      const requiredSlugs = ['home', 'about', 'contact'];
      let pagesCreated = 0;
      
      // Get or create contact form for contact page
      let finalContactFormId: string | undefined;
      const existingContactForm = await prisma.form_builders.findFirst({
        where: {
          tenant_id: tenant.id,
          slug: 'contact-form',
        },
      });
      if (existingContactForm) {
        finalContactFormId = existingContactForm.id;
      } else {
        // Create contact form if it doesn't exist
        try {
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
          finalContactFormId = contactForm.id;
          console.log(`[Registration] ✅ Created contact form in final verification (ID: ${finalContactFormId})`);
        } catch (formError: any) {
          console.error(`[Registration] ❌ Failed to create contact form in final verification:`, formError);
        }
      }
      
      for (const slug of requiredSlugs) {
        try {
          const pageSlug = generateSlug(slug);
          const existingPage = await prisma.pages.findFirst({
            where: {
              tenant_id: tenant.id,
              slug: pageSlug,
            },
          });
          
          if (!existingPage) {
            console.log(`[Registration] ⚠️ Required page missing in final check: ${slug}, creating now...`);
            
            if (slug === 'home') {
              // Create homepage with business-specific content
              let themeSlug = 'grocery'; // Default to grocery theme
              if (validatedData.themeId) {
                try {
                  const theme = await prisma.themes.findUnique({ 
                    where: { id: validatedData.themeId }, 
                    select: { slug: true } 
                  });
                  if (theme) {
                    themeSlug = theme.slug;
                  }
                } catch (themeError) {
                  console.error(`[Registration] Error fetching theme for homepage:`, themeError);
                  // Use default 'grocery'
                }
              }
              const homePageBuilderData = createDefaultHomepageTemplate(themeSlug, tenantName, validatedData.businessType || undefined);
              const cleanedHomePageData = cleanBlobUrlsFromPageBuilder(homePageBuilderData);
              
              // Handle global unique constraint on slug
              try {
                // Check if slug exists globally (for any tenant)
                const globalPageCheck = await prisma.pages.findFirst({
                  where: {
                    slug: pageSlug,
                  },
                  select: {
                    id: true,
                    tenant_id: true,
                  },
                });

                if (globalPageCheck && globalPageCheck.tenant_id !== tenant.id) {
                  console.error(`[Registration] ❌ CRITICAL: Slug '${pageSlug}' already exists for tenant ${globalPageCheck.tenant_id}. Database schema needs @@unique([tenant_id, slug]) constraint.`);
                  throw new Error(`Slug '${pageSlug}' is already in use by another tenant. Database schema issue.`);
                }

                await prisma.pages.create({
                  data: {
                    tenant_id: tenant.id,
                    title: 'Home',
                    slug: pageSlug,
                    content: JSON.stringify(cleanedHomePageData),
                    status: 'published',
                    banner_image: null,
                    meta_title: `${tenantName} - Home`,
                    meta_description: `Welcome to ${tenantName}. Shop our amazing products and discover great deals.`,
                  },
                });
                pagesCreated++;
                console.log(`[Registration] ✅ Created missing homepage in final verification (slug: ${pageSlug})`);
              } catch (createError: any) {
                if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
                  console.error(`[Registration] ❌ CRITICAL: Unique constraint violation on slug '${pageSlug}'. Database schema has global unique constraint instead of per-tenant.`);
                  console.error(`[Registration] Schema should have: @@unique([tenant_id, slug]) instead of: slug @unique`);
                }
                throw createError;
              }
            } else {
              // Create about or contact page
              const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
              const pageConfig = additionalPageTemplates.find(p => p.slug === slug);
              
              if (pageConfig) {
                let pageBuilderData;
                if (slug === 'contact') {
                  pageBuilderData = pageConfig.templateGenerator(tenantName, finalContactFormId, tenant.contact_email || undefined);
                } else {
                  pageBuilderData = pageConfig.templateGenerator(tenantName);
                }
                pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);
                
                // Handle global unique constraint on slug
                try {
                  // Check if slug exists globally (for any tenant)
                  const globalPageCheck = await prisma.pages.findFirst({
                    where: {
                      slug: pageSlug,
                    },
                    select: {
                      id: true,
                      tenant_id: true,
                    },
                  });

                  if (globalPageCheck && globalPageCheck.tenant_id !== tenant.id) {
                    console.error(`[Registration] ❌ CRITICAL: Slug '${pageSlug}' already exists for tenant ${globalPageCheck.tenant_id}. Database schema needs @@unique([tenant_id, slug]) constraint.`);
                    throw new Error(`Slug '${pageSlug}' is already in use by another tenant. Database schema issue.`);
                  }

                  await prisma.pages.create({
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
                  pagesCreated++;
                  console.log(`[Registration] ✅ Created missing page in final verification: ${pageConfig.title} (slug: ${pageSlug})`);
                } catch (createError: any) {
                  if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
                    console.error(`[Registration] ❌ CRITICAL: Unique constraint violation on slug '${pageSlug}'. Database schema has global unique constraint instead of per-tenant.`);
                    console.error(`[Registration] Schema should have: @@unique([tenant_id, slug]) instead of: slug @unique`);
                  }
                  throw createError;
                }
              }
            }
          } else {
            console.log(`[Registration] ✅ Verified page exists: ${slug} (slug: ${pageSlug})`);
          }
        } catch (pageError: any) {
          console.error(`[Registration] ❌ Failed to create/verify page ${slug} in final check:`, pageError);
        }
      }
      
      if (pagesCreated > 0) {
        console.log(`[Registration] ✅ Created ${pagesCreated} missing page(s) in final verification`);
      } else {
        console.log(`[Registration] ✅ All required pages verified and exist`);
      }
      
      // Final database verification - query all pages for this tenant
      try {
        const allPagesForTenant = await prisma.pages.findMany({
          where: {
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        });
        
        console.log(`[Registration] 📋 Final database check - Pages for tenant ${tenant.id} (${tenant.subdomain}):`, {
          totalPages: allPagesForTenant.length,
          pages: allPagesForTenant.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            created: p.created_at,
          })),
        });
        
        // Verify required pages exist
        const foundSlugs = allPagesForTenant.map(p => p.slug?.toLowerCase()).filter(Boolean);
        const missingRequired = requiredSlugs.filter(slug => !foundSlugs.includes(slug.toLowerCase()));
        
        if (missingRequired.length > 0) {
          console.error(`[Registration] ⚠️ WARNING: Required pages still missing after all attempts:`, missingRequired);
          console.error(`[Registration] Found slugs:`, foundSlugs);
        } else {
          console.log(`[Registration] ✅ All required pages confirmed in database`);
        }
      } catch (dbCheckError: any) {
        console.error(`[Registration] ❌ Error in final database check:`, dbCheckError);
      }
    } catch (verifyError: any) {
      console.error(`[Registration] ❌ Error in final page verification:`, verifyError);
      // Don't fail registration - pages might still exist
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant registered successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
      loginUrl,
      demoContentCreated,
      demoProductsCreated,
      demoCategoriesCreated,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Tenant registration error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation failed',
          errors: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An error occurred during registration. Please try again.'
      },
      { status: 500 }
    );
  }
}

