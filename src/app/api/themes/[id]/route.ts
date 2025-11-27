/**
 * Single Theme API Route
 * 
 * GET: Get theme details
 * PUT: Update theme (admin only)
 * DELETE: Delete theme (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const theme = await prisma.themes.findUnique({
      where: { id },
    });

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ theme });
  } catch (error: any) {
    console.error('Error fetching theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add admin authentication check
    const { id } = await params;
    const body = await request.json();

    const theme = await prisma.themes.update({
      where: { id },
      data: {
        ...body,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ theme });
  } catch (error: any) {
    console.error('Error updating theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update theme' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add admin authentication check
    const { id } = await params;

    await prisma.themes.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete theme' },
      { status: 500 }
    );
  }
}

