/**
 * GET /api/dashboard/reward-checklist
 * Reward checklist for completing storefront setup within 30 days (+30 bonus days).
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { loadRewardChecklistForTenant } from '@/lib/onboarding/onboarding-reward';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const data = await loadRewardChecklistForTenant(tenant.id);
    if (!data) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Reward Checklist] Error:', error);
    return NextResponse.json({ error: 'Failed to load reward checklist' }, { status: 500 });
  }
}
