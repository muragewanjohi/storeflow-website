import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import { setStaticOptions } from '@/lib/settings/static-options';
import { tumiziClient } from '@/lib/tumizi/client';
import {
  getTumiziTenantConfigByTenantId,
  upsertTumiziTenantConfig,
} from '@/lib/tumizi/config';
import {
  TUMIZI_DEFAULT_MERCHANT_COUNTRY,
  TUMIZI_DEFAULT_WALLET_CURRENCY,
  buildTumiziMerchantDomainHostname,
  buildTumiziMerchantRegistrationDescription,
} from '@/lib/tumizi/create-merchant-defaults';
import { getErrorMessage, getErrorStatus } from '@/lib/tumizi/mobile-route-helpers';

const settingsSchema = z.object({
  enabled: z.boolean(),
  merchantExternalId: z.string().min(3).max(100).optional(),
  createMerchantIfMissing: z.boolean().optional().default(false),
});

function normalizeMerchantPhone(raw: string | null | undefined): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  return '254700000001';
}

function getWebhookConfig() {
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '').trim();
  const webhookToken = (process.env.PAYMENT_WEBHOOK_TOKEN || '').trim();
  const normalizedBaseUrl = appBaseUrl
    ? appBaseUrl.startsWith('http')
      ? appBaseUrl.replace(/\/$/, '')
      : `https://${appBaseUrl.replace(/\/$/, '')}`
    : '';

  return {
    webhookUrl:
      normalizedBaseUrl && webhookToken
        ? `${normalizedBaseUrl}/api/tumizi/webhook?token=${encodeURIComponent(webhookToken)}`
        : null,
    webhookEvents: [
      'partner.customer_payment.updated',
      'partner.withdrawal.updated',
      'partner.refund.updated',
    ],
  };
}

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    return NextResponse.json(
      mobileSuccess((await getTumiziTenantConfigByTenantId(gate.ctx.tenantId)) ?? { enabled: false }),
      { status: 200 },
    );
  } catch (error) {
    const status = getErrorStatus(error);
    console.error('[Mobile Tumizi settings GET]', error);
    return NextResponse.json(
      mobileError(
        status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        getErrorMessage(error, 'Failed to fetch Tumizi settings'),
      ),
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  if (gate.ctx.user.role !== 'tenant_admin') {
    return NextResponse.json(
      mobileError('FORBIDDEN', 'Only the store owner can update Tumizi settings'),
      { status: 403 },
    );
  }

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const payload = settingsSchema.parse(await request.json());
    const tenantRecord = await prisma.tenants.findUnique({
      where: { id: gate.ctx.tenantId },
      select: { name: true, subdomain: true, contact_email: true },
    });
    const storePhoneOption = await prisma.static_options.findUnique({
      where: {
        tenant_id_option_name: {
          tenant_id: gate.ctx.tenantId,
          option_name: 'store_phone',
        },
      },
      select: { option_value: true },
    });

    const current = (await getTumiziTenantConfigByTenantId(gate.ctx.tenantId)) ?? {
      enabled: false,
    };
    const merchantExternalId =
      payload.merchantExternalId || current.merchantExternalId || `storeflow-${gate.ctx.tenantId}`;
    const { webhookUrl, webhookEvents } = getWebhookConfig();

    if (payload.enabled && payload.createMerchantIfMissing && !current.merchantExternalId) {
      const sub = (tenantRecord?.subdomain || gate.ctx.tenant.subdomain).trim();
      const storeName = (tenantRecord?.name || gate.ctx.tenant.name).trim() || 'Store';
      const merchantEmail = tenantRecord?.contact_email || 'support@dukanest.com';

      await tumiziClient.createMerchant({
        merchant_external_id: merchantExternalId,
        merchant: {
          name: storeName,
          email: merchantEmail,
          phone: normalizeMerchantPhone(storePhoneOption?.option_value),
          country: TUMIZI_DEFAULT_MERCHANT_COUNTRY,
          domain: buildTumiziMerchantDomainHostname(sub),
          description: buildTumiziMerchantRegistrationDescription(storeName),
        },
        owner: {
          name: storeName,
          email: merchantEmail,
        },
        wallet: {
          name: 'Main Wallet',
          account_number: merchantExternalId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16),
          currency: TUMIZI_DEFAULT_WALLET_CURRENCY,
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

    const saved = await upsertTumiziTenantConfig(gate.ctx.tenantId, {
      enabled: payload.enabled,
      merchantExternalId,
      walletAccountNumber:
        typeof wallet?.account_number === 'string' ? wallet.account_number : current.walletAccountNumber,
      walletCurrency: typeof wallet?.currency === 'string' ? wallet.currency : current.walletCurrency,
      webhookUrl: webhookUrl ?? current.webhookUrl,
      webhookEvents,
      lastSyncedAt: new Date().toISOString(),
    });

    await setStaticOptions(gate.ctx.tenantId, {
      payment_tumizi_enabled: saved.enabled && !!saved.merchantExternalId ? 'true' : 'false',
    });

    return NextResponse.json(mobileSuccess(saved), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }

    const status = getErrorStatus(error);
    console.error('[Mobile Tumizi settings POST]', error);
    return NextResponse.json(
      mobileError(
        status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        getErrorMessage(error, 'Failed to save Tumizi settings'),
      ),
      { status },
    );
  }
}
