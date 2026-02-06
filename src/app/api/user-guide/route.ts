/**
 * Public User Guide API Route
 * 
 * Handles GET requests for public user guide content
 * No authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/user-guide
 * Get all active user guide categories and articles for public display
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.user_guide_categories.findMany({
      where: {
        is_active: true,
      },
      include: {
        articles: {
          where: {
            is_active: true,
          },
          orderBy: {
            sort_order: 'asc',
          },
        },
      },
      orderBy: {
        sort_order: 'asc',
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching user guide:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user guide' },
      { status: 500 }
    );
  }
}
