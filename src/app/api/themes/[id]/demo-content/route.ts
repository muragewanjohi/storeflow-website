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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch theme from database
    const theme = await prisma.themes.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Get theme template configuration
    const template = getThemeTemplate(theme.slug);
    
    if (!template) {
      return NextResponse.json({ error: 'Theme template not found' }, { status: 404 });
    }

    // Get demo content based on industry
    const demoProducts = getDemoProducts(template.industry, template.demoContent.products);
    const demoCategories = getDemoCategories(template.industry);

    return NextResponse.json({
      theme: {
        id: theme.id,
        slug: theme.slug,
        title: theme.title,
        industry: template.industry,
      },
      products: demoProducts,
      categories: demoCategories,
    });
  } catch (error) {
    console.error('Error fetching demo content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demo content' },
      { status: 500 }
    );
  }
}

