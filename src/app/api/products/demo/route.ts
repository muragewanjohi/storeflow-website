import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { removeActiveDemoProducts } from '@/lib/products/demo-products';

export async function DELETE() {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const result = await removeActiveDemoProducts(tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message:
          result.removedCount > 0
            ? 'Demo products removed successfully'
            : 'No active demo products found',
      },
    });
  } catch (error) {
    console.error('[Demo Products DELETE]', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
      }
      if (error.message === 'Authentication required') {
        return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to remove demo products' },
      { status: 500 },
    );
  }
}
