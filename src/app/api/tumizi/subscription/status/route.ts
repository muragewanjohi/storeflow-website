/**
 * GET /api/tumizi/subscription/status?external_reference=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import {
  TumiziSubscriptionError,
  queryTumiziSubscriptionPaymentStatus,
} from '@/lib/subscriptions/tumizi-subscription';

const statusQuerySchema = z.object({
  external_reference: z.string().min(1, 'external_reference is required'),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);

    const tenant = await requireTenant();

    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { external_reference } = statusQuerySchema.parse({
      external_reference:
        searchParams.get('external_reference') ??
        searchParams.get('checkout_request_id') ??
        searchParams.get('checkoutRequestId') ??
        undefined,
    });

    const result = await queryTumiziSubscriptionPaymentStatus({
      tenantId: tenant.id,
      externalReference: external_reference,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Tumizi Subscription Status] Error:', error);

    if (error instanceof TumiziSubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', errors: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Failed to query payment status' }, { status: 500 });
  }
}
