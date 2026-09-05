import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { tumiziClient } from '@/lib/tumizi/client';

const updateMerchantSchema = z.object({
  merchant: z
    .object({
      name: z.string().min(1).max(255).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(7).max(30).optional(),
      country: z.string().min(2).max(120).optional(),
      description: z.string().max(255).optional(),
      status: z.string().min(3).max(40).optional(),
    })
    .optional(),
  owner: z
    .object({
      name: z.string().min(1).max(255).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  wallet: z
    .object({
      name: z.string().min(1).max(255).optional(),
      account_number: z.string().min(3).max(40).optional(),
      currency: z.string().min(3).max(10).optional(),
    })
    .optional(),
  status: z.string().min(3).max(40).optional(),
});

function getMerchantExternalIdOrThrow(config: Awaited<ReturnType<typeof getTumiziTenantConfigByTenantId>>) {
  if (!config?.enabled || !config.merchantExternalId) {
    const error = new Error('Tumizi is not enabled for this store');
    (error as any).status = 400;
    throw error;
  }
  return config.merchantExternalId;
}

export async function GET() {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();

    const config = await getTumiziTenantConfigByTenantId(tenant.id);
    const merchantExternalId = getMerchantExternalIdOrThrow(config);

    const [merchant, wallet] = await Promise.all([
      tumiziClient.getMerchant(merchantExternalId),
      tumiziClient.getMerchantWallet(merchantExternalId).catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        merchantExternalId,
        merchant,
        wallet,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch merchant details' },
      { status: error.status || 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);
    const tenant = await requireTenant();

    const config = await getTumiziTenantConfigByTenantId(tenant.id);
    const merchantExternalId = getMerchantExternalIdOrThrow(config);
    const payload = updateMerchantSchema.parse(await request.json());

    const updated = await tumiziClient.updateMerchant(merchantExternalId, payload);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update merchant details' },
      { status: error.status || 500 },
    );
  }
}
