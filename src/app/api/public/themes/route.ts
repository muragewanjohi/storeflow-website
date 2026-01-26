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
    const themes = await prisma.themes.findMany({
      where: {
        status: true, // Only return active themes
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

    return NextResponse.json({ themes });
  } catch (error: any) {
    console.error('Error fetching public themes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}
