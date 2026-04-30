import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { removeActiveDemoProducts } from '@/lib/products/demo-products';

export async function DELETE(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;

  try {
    const result = await removeActiveDemoProducts(tenantId);

    return NextResponse.json(
      mobileSuccess({
        ...result,
        message:
          result.removedCount > 0
            ? 'Demo products removed successfully'
            : 'No active demo products found',
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile demo products DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to remove demo products'), { status: 500 });
  }
}
