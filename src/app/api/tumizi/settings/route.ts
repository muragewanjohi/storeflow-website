import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { tumiziClient } from '@/lib/tumizi/client';
import {
  getTumiziTenantConfigByTenantId,
  upsertTumiziTenantConfig,
} from '@/lib/tumizi/config';

const settingsSchema = z.object({
  enabled: z.boolean(),
  merchantExternalId: z.string().min(3).max(100).optional(),
  createMerchantIfMissing: z.boolean().optional().default(false),
});

function normalizeMerchantPhone(raw: string | null | undefined): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  return '254700000001';
}

export async function GET() {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();

    return NextResponse.json({
      success: true,
      data: (await getTumiziTenantConfigByTenantId(tenant.id)) ?? { enabled: false },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Tumizi settings' },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);
    const tenant = await requireTenant();
    const payload = settingsSchema.parse(await request.json());

    const tenantRecord = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      select: { name: true, subdomain: true, contact_email: true },
    });
    const storePhoneOption = await prisma.static_options.findUnique({
      where: {
        tenant_id_option_name: {
          tenant_id: tenant.id,
          option_name: 'store_phone',
        },
      },
      select: { option_value: true },
    });

    const current = (await getTumiziTenantConfigByTenantId(tenant.id)) ?? { enabled: false };
    const merchantExternalId =
      payload.merchantExternalId || current.merchantExternalId || `storeflow-${tenant.id}`;

    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '').trim();
    const webhookToken = (process.env.PAYMENT_WEBHOOK_TOKEN || '').trim();
    const normalizedBaseUrl = appBaseUrl
      ? appBaseUrl.startsWith('http')
        ? appBaseUrl.replace(/\/$/, '')
        : `https://${appBaseUrl.replace(/\/$/, '')}`
      : '';
    const webhookUrl =
      normalizedBaseUrl && webhookToken
        ? `${normalizedBaseUrl}/api/tumizi/webhook?token=${encodeURIComponent(webhookToken)}`
        : null;
    const webhookEvents = [
      'partner.customer_payment.updated',
      'partner.withdrawal.updated',
      'partner.refund.updated',
    ];

    if (payload.enabled && payload.createMerchantIfMissing && !current.merchantExternalId) {
      const ownerEmail = tenantRecord?.contact_email || 'support@dukanest.com';
      await tumiziClient.createMerchant({
        merchant_external_id: merchantExternalId,
        merchant: {
          name: tenantRecord?.name || tenant.name,
          email: ownerEmail,
          phone: normalizeMerchantPhone(storePhoneOption?.option_value),
          country: 'Kenya',
          domain: `${tenantRecord?.subdomain || tenant.subdomain}.dukanest.com`,
          description: `Storeflow merchant for ${tenantRecord?.name || tenant.name}`,
        },
        owner: {
          name: tenantRecord?.name || tenant.name,
          email: ownerEmail,
        },
        wallet: {
          name: 'Main Wallet',
          account_number: merchantExternalId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16),
          currency: 'KES',
        },
        ...(webhookUrl
          ? {
              webhooks: [
                {
                  name: 'Storeflow Tumizi Webhook',
                  callback_url: webhookUrl,
                  events: webhookEvents,
                },
              ],
            }
          : {}),
      });
    }

    const walletInfo = payload.enabled
      ? await tumiziClient.getMerchantWallet(merchantExternalId).catch(() => null)
      : null;

    const wallet = (walletInfo?.wallet as Record<string, unknown> | undefined) || undefined;

    const nextConfig = {
      enabled: payload.enabled,
      merchantExternalId,
      walletAccountNumber:
        typeof wallet?.account_number === 'string' ? wallet.account_number : current.walletAccountNumber,
      walletCurrency: typeof wallet?.currency === 'string' ? wallet.currency : current.walletCurrency,
      webhookUrl: webhookUrl ?? current.webhookUrl,
      webhookEvents: webhookEvents,
      lastSyncedAt: new Date().toISOString(),
    };

    const saved = await upsertTumiziTenantConfig(tenant.id, nextConfig);

    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save Tumizi settings' },
      { status: error.status || 500 },
    );
  }
}
