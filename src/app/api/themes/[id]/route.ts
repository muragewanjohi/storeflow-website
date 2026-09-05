/**
 * Single Theme API Route
 * 
 * GET: Get theme details
 * PUT: Update theme (admin only)
 * DELETE: Delete theme (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireAuth, requireRole } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof Error) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { message: 'Access denied. Landlord role required.' },
        { status: 403 }
      );
    }
  }
  return null;
}

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
    const user = await requireAuth();
    requireRole(user, 'landlord');

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
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

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
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;

    await prisma.themes.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error('Error deleting theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete theme' },
      { status: 500 }
    );
  }
}

