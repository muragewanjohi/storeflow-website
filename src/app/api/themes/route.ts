/**
 * Themes API Route
 * 
 * GET: List all available themes
 * POST: Create a new theme (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const isPremium = searchParams.get('is_premium');

    const where: any = {};
    if (status !== null) {
      where.status = status === 'true';
    }
    if (isPremium !== null) {
      where.is_premium = isPremium === 'true';
    }

    const themes = await prisma.themes.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({ themes });
  } catch (error: any) {
    console.error('Error fetching themes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    const body = await request.json();
    const {
      title,
      slug,
      description,
      author,
      version,
      is_premium,
      price,
      theme_url,
      screenshot_url,
      config,
      colors,
      typography,
    } = body;

    const theme = await prisma.themes.create({
      data: {
        title,
        slug,
        description,
        author: author || 'StoreFlow',
        version: version || '1.0.0',
        is_premium: is_premium || false,
        price: price ? parseFloat(price) : null,
        theme_url,
        screenshot_url,
        config: config || {},
        colors: colors || {},
        typography: typography || {},
        status: true,
      },
    });

    return NextResponse.json({ theme }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create theme' },
      { status: 500 }
    );
  }
}

