/**
 * Migration API Route
 * 
 * Migrates existing flash_sale sections to sales_tab sections
 * 
 * Phase 5: Migration & Testing - Sales Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

/**
 * POST /api/admin/migrate-flash-sale-sections
 * 
 * Migrates all flash_sale sections in pages to sales_tab sections
 * 
 * Security: Requires tenant_admin or landlord role
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'landlord'], '/login');

    // Only allow landlords to run this migration
    if (user.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Unauthorized - Only landlords can run migrations' },
        { status: 403 }
      );
    }

    // Fetch all pages with content
    const pages = await prisma.pages.findMany({
      where: {
        content: {
          not: null,
        },
      },
      select: {
        id: true,
        tenant_id: true,
        title: true,
        slug: true,
        content: true,
      },
    });

    let migratedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const page of pages) {
      if (!page.content) continue;

      try {
        // Parse page content (should be JSON)
        let contentData: any;
        try {
          contentData = JSON.parse(page.content);
        } catch (parseError) {
          // If not JSON, skip this page (might be HTML content)
          continue;
        }

        // Check if content has sections array
        if (!contentData.sections || !Array.isArray(contentData.sections)) {
          continue;
        }

        let hasChanges = false;

        // Migrate flash_sale sections to sales_tab
        const updatedSections = contentData.sections.map((section: any) => {
          if (section.type === 'flash_sale') {
            hasChanges = true;
            return {
              ...section,
              type: 'sales_tab',
              display_mode: section.display_mode || 'single_sale',
              // Preserve existing properties
              title: section.title || 'Super Flash Sale',
              limit: section.limit || 8,
              columns: section.columns || 4,
              show_countdown: section.show_countdown !== undefined ? section.show_countdown : true,
              show_badge: section.show_badge !== undefined ? section.show_badge : true,
              badge_text: section.badge_text,
              badge_color: section.badge_color,
              layout: section.layout || 'grid',
              banner_style: section.banner_style || 'contained',
              product_card_style: section.product_card_style || 'default',
              cta_position: section.cta_position || 'top_right',
              // Map category_id to sale_id if needed (will need manual selection)
              sale_id: section.sale_id || section.category_id || undefined,
            };
          }
          return section;
        });

        if (hasChanges) {
          // Update page content
          const updatedContent = {
            ...contentData,
            sections: updatedSections,
          };

          await prisma.pages.update({
            where: { id: page.id },
            data: {
              content: JSON.stringify(updatedContent),
            },
          });

          migratedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push(
          `Failed to migrate page ${page.title} (${page.slug || page.id}): ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        console.error(`Error migrating page ${page.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migratedCount} pages migrated, ${errorCount} errors`,
      migratedCount,
      errorCount,
      totalPages: pages.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate-flash-sale-sections
 * 
 * Check how many pages have flash_sale sections that need migration
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'landlord'], '/login');

    // Fetch all pages with content
    const pages = await prisma.pages.findMany({
      where: {
        content: {
          not: null,
        },
      },
      select: {
        id: true,
        tenant_id: true,
        title: true,
        slug: true,
        content: true,
      },
    });

    let flashSaleCount = 0;
    const pagesWithFlashSale: Array<{ id: string; title: string; slug: string | null }> = [];

    for (const page of pages) {
      if (!page.content) continue;

      try {
        const contentData = JSON.parse(page.content);
        if (contentData.sections && Array.isArray(contentData.sections)) {
          const hasFlashSale = contentData.sections.some(
            (section: any) => section.type === 'flash_sale'
          );
          if (hasFlashSale) {
            flashSaleCount++;
            pagesWithFlashSale.push({
              id: page.id,
              title: page.title,
              slug: page.slug,
            });
          }
        }
      } catch {
        // Skip non-JSON content
        continue;
      }
    }

    return NextResponse.json({
      totalPages: pages.length,
      flashSaleSectionsFound: flashSaleCount,
      pagesWithFlashSale,
      needsMigration: flashSaleCount > 0,
    });
  } catch (error) {
    console.error('Check migration error:', error);
    return NextResponse.json(
      {
        error: 'Check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
