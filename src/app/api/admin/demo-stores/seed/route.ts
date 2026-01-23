/**
 * Demo Stores Seed API Route
 * 
 * POST: Seed all demo stores for theme preview
 * 
 * Creates 12 demo stores (one per business type) with:
 * - 50 products and 10 categories
 * - 5 customers
 * - 10 orders
 * - Admin and staff users
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { seedAllDemoStores } from '@/lib/themes/demo-store-seed';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    console.log('[Demo Store Seed API] Starting seed process...');

    // Run seed in background (don't wait for completion)
    seedAllDemoStores().catch((error) => {
      console.error('[Demo Store Seed API] Seed process error:', error);
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Demo store seed process started. Check logs for progress.',
      },
      { status: 202 } // Accepted - processing in background
    );
  } catch (error: any) {
    console.error('[Demo Store Seed API] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to start seed process',
      },
      { status: 500 }
    );
  }
}
