/**
 * POST /api/v1/mobile/pos/sales
 *
 * Idempotent point-of-sale sale create. Called only by the Flutter app's
 * SyncManager (never directly by the UI) so that offline retries are safe:
 * re-POSTing the same `client_sale_id` returns the existing order unchanged.
 *
 * Design: storeflow/docs/POS_OFFLINE_DESIGN.md §6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import { posSaleSchema } from '@/lib/pos/validation';
import { PosSaleError, createPosSale } from '@/lib/pos/create-sale';

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const parsed = posSaleSchema.parse(await request.json());
    const result = await createPosSale(gate.ctx.tenant, gate.ctx.user.id, parsed);

    return NextResponse.json(mobileSuccess({ sale: result }), {
      status: result.deduplicated ? 200 : 201,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid POS sale payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof PosSaleError) {
      return NextResponse.json(mobileError(error.code, error.message), {
        status: error.status,
      });
    }
    console.error('[Mobile POS sale]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to record POS sale'),
      { status: 500 },
    );
  }
}
