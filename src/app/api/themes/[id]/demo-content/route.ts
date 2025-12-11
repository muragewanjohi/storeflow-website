/**
 * Demo Content API
 * 
 * Returns demo content for theme previews based on theme industry
 * Day 37: Theme Templates with Demo Content
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getThemeTemplate } from '@/lib/themes/theme-registry';
import { getDemoProducts, getDemoCategories } from '@/lib/themes/demo-content';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Allow up to 10 seconds for the API route

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;

    // Always query database first to get the correct theme by ID
    let theme: { id: string; slug: string; title: string } | null = null;
    try {
      theme = await prisma.themes.findUnique({
        where: { id },
        select: {
          id: true,
          slug: true,
          title: true,
        },
      });
    } catch (dbError) {
      console.warn('Database query failed, using fallback:', dbError);
    }

    if (!theme) {
      // Final fallback: Use default template
      const defaultTemplate = getThemeTemplate('default');
      if (defaultTemplate) {
        return NextResponse.json({
          theme: {
            id,
            slug: 'default',
            title: 'Default Theme',
            industry: defaultTemplate.industry,
          },
          products: getDemoProducts(defaultTemplate.industry, defaultTemplate.demoContent.products),
          categories: getDemoCategories(defaultTemplate.industry),
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-Response-Time': `${Date.now() - startTime}ms`,
          },
        });
      }
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Get theme template configuration
    const themeTemplate = getThemeTemplate(theme.slug);
    
    if (!themeTemplate) {
      // Use default template if specific one not found
      const defaultTemplate = getThemeTemplate('default');
      if (defaultTemplate) {
        return NextResponse.json({
          theme: {
            id: theme.id,
            slug: theme.slug,
            title: theme.title,
            industry: defaultTemplate.industry,
          },
          products: getDemoProducts(defaultTemplate.industry, defaultTemplate.demoContent.products),
          categories: getDemoCategories(defaultTemplate.industry),
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-Response-Time': `${Date.now() - startTime}ms`,
          },
        });
      }
      return NextResponse.json({ error: 'Theme template not found' }, { status: 404 });
    }

    // Get demo content based on industry (synchronous, fast)
    const demoProducts = getDemoProducts(themeTemplate.industry, themeTemplate.demoContent.products);
    const demoCategories = getDemoCategories(themeTemplate.industry);

    return NextResponse.json({
      theme: {
        id: theme.id,
        slug: theme.slug,
        title: theme.title,
        industry: themeTemplate.industry,
      },
      products: demoProducts,
      categories: demoCategories,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    console.error('Error fetching demo content:', error);
    
    // Return fallback content on error (always succeeds)
    const fallbackTemplate = getThemeTemplate('default');
    if (fallbackTemplate) {
      return NextResponse.json({
        theme: {
          id: 'fallback',
          slug: 'default',
          title: 'Default Theme',
          industry: fallbackTemplate.industry,
        },
        products: getDemoProducts(fallbackTemplate.industry, 8),
        categories: getDemoCategories(fallbackTemplate.industry),
      }, {
        status: 200, // Return 200 with fallback data
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch demo content' },
      { status: 500 }
    );
  }
}

