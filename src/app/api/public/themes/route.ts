/**
 * Public Themes API Route
 * 
 * GET: List all available themes (public access, no auth required)
 * Used for registration page theme selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Only return the Grocery theme (which will be renamed to Multipurpose in the UI)
    // Other themes are not yet ready
    const themes = await prisma.themes.findMany({
      where: {
        status: true,
        slug: 'grocery', // Only return the Grocery theme
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        screenshot_url: true,
        is_premium: true,
        price: true,
      },
    });

    // Rename "Grocery" theme to "Multipurpose" in the response
    const themesWithRenamed = themes.map(theme => {
      if (theme.slug?.toLowerCase() === 'grocery' || theme.title?.toLowerCase().includes('grocery')) {
        return {
          ...theme,
          title: theme.title?.replace(/Grocery/gi, 'Multipurpose') || 'Multipurpose Theme',
        };
      }
      return theme;
    });

    return NextResponse.json({ themes: themesWithRenamed });
  } catch (error: any) {
    console.error('Error fetching public themes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}
