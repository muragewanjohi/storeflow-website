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

    console.log('[Demo Store Seed API] 🚀 Starting seed process...');
    console.log('[Demo Store Seed API] This will create 12 demo stores. Process may take 10-30 minutes.');

    // Run seed in background (don't wait for completion)
    // Logs will be visible in Vercel logs
    seedAllDemoStores()
      .then(() => {
        console.log('[Demo Store Seed API] ✅ Seed process completed successfully');
      })
      .catch((error) => {
        console.error('[Demo Store Seed API] ❌ Seed process error:', error);
        console.error('[Demo Store Seed API] Error stack:', error?.stack);
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
