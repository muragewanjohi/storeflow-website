/**
 * Demo Store Reset API
 * 
 * Resets a demo store to its original state
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { resetDemoStore, isDemoStore } from '@/lib/demo-store/seed-demo-data';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/demo-stores/reset
 * Reset a demo store to original state
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Verify tenant exists and is a demo store
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    if (!isDemoStore(tenant)) {
      return NextResponse.json(
        { error: 'This is not a demo store' },
        { status: 400 }
      );
    }

    // Reset the demo store
    await resetDemoStore(tenantId);

    return NextResponse.json({
      message: 'Demo store reset successfully',
      tenantId,
    });
  } catch (error) {
    console.error('Error resetting demo store:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset demo store',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

