/**
 * POST /api/dashboard/pos/sales
 *
 * Web dashboard POS — record a counter sale. Cookie-session auth; the sale
 * logic (idempotency, tax/COGS, stock, oversell, Tumizi STK) is the shared
 * @/lib/pos/create-sale core, same as the mobile route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePosDashboardStaff } from '@/lib/pos/dashboard-auth';
import { posSaleSchema } from '@/lib/pos/validation';
import { PosSaleError, createPosSale } from '@/lib/pos/create-sale';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const gate = await requirePosDashboardStaff();
  if (!gate.ok) return gate.response;

  try {
    const parsed = posSaleSchema.parse(await request.json());
    const sale = await createPosSale(gate.tenant, gate.user.id, parsed);
    return NextResponse.json(
      { success: true, sale },
      { status: sale.deduplicated ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid POS sale',
          issues: error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }
    if (error instanceof PosSaleError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error('[Dashboard POS sale]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record POS sale' },
      { status: 500 },
    );
  }
}
