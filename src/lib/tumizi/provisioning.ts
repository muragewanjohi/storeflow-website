import { prisma } from '@/lib/prisma/client';
import { tumiziClient } from '@/lib/tumizi/client';
import { upsertTumiziTenantConfig } from '@/lib/tumizi/config';

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

function getWebhookConfig(): { url?: string; events: string[] } {
  const webhookEvents = [
    'partner.customer_payment.updated',
    'partner.withdrawal.updated',
    'partner.refund.updated',
  ];

  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '').trim();
  const webhookToken = (process.env.PAYMENT_WEBHOOK_TOKEN || '').trim();
  if (!appBaseUrl || !webhookToken) {
    return { events: webhookEvents };
  }

  const normalizedBaseUrl = appBaseUrl.startsWith('http')
    ? appBaseUrl.replace(/\/$/, '')
    : `https://${appBaseUrl.replace(/\/$/, '')}`;
  return {
    url: `${normalizedBaseUrl}/api/tumizi/webhook?token=${encodeURIComponent(webhookToken)}`,
    events: webhookEvents,
  };
}

export async function queueTumiziProvisioningForTenant(tenantId: string): Promise<void> {
  const existing = await prisma.tenant_tumizi_integrations.findUnique({
    where: { tenant_id: tenantId },
  });

  const metadata = {
    ...(((existing?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>),
    autoProvision: true,
    provisioning_status: 'pending',
    queuedAt: new Date().toISOString(),
    attempts: Number((((existing?.metadata as any) || {}).attempts as number) || 0),
    lastError: null,
  };

  await prisma.tenant_tumizi_integrations.upsert({
    where: { tenant_id: tenantId },
    update: {
      metadata: metadata as any,
      updated_at: new Date(),
    },
    create: {
      tenant_id: tenantId,
      enabled: false,
      metadata: metadata as any,
    },
  });
}

async function provisionSingleTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      contact_email: true,
      deleted_at: true,
    },
  });
  if (!tenant || tenant.deleted_at) {
    return { success: false, error: 'Tenant not found or deleted' };
  }

  const storePhoneOption = await prisma.static_options.findUnique({
    where: {
      tenant_id_option_name: {
        tenant_id: tenantId,
        option_name: 'store_phone',
      },
    },
    select: { option_value: true },
  });

  const merchantExternalId = `storeflow-${tenant.id}`;
  const ownerEmail = tenant.contact_email || 'support@dukanest.com';
  const webhook = getWebhookConfig();

  await tumiziClient.createMerchant({
    merchant_external_id: merchantExternalId,
    merchant: {
      name: tenant.name,
      email: ownerEmail,
      phone: normalizeMerchantPhone(storePhoneOption?.option_value),
      country: 'Kenya',
      domain: `${tenant.subdomain}.dukanest.com`,
      description: `Storeflow merchant for ${tenant.name}`,
    },
    owner: {
      name: tenant.name,
      email: ownerEmail,
    },
    wallet: {
      name: 'Main Wallet',
      account_number: merchantExternalId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16),
      currency: 'KES',
    },
    ...(webhook.url
      ? {
          webhooks: [
            {
              name: 'Storeflow Tumizi Webhook',
              callback_url: webhook.url,
              events: webhook.events,
            },
          ],
        }
      : {}),
  });

  const walletInfo = await tumiziClient.getMerchantWallet(merchantExternalId).catch(() => null);
  const wallet = (walletInfo?.wallet as Record<string, unknown> | undefined) || undefined;

  await upsertTumiziTenantConfig(tenant.id, {
    enabled: true,
    merchantExternalId,
    walletAccountNumber:
      typeof wallet?.account_number === 'string' ? wallet.account_number : undefined,
    walletCurrency: typeof wallet?.currency === 'string' ? wallet.currency : undefined,
    webhookUrl: webhook.url,
    webhookEvents: webhook.events,
    lastSyncedAt: new Date().toISOString(),
  });

  const integration = await prisma.tenant_tumizi_integrations.findUnique({
    where: { tenant_id: tenant.id },
    select: { metadata: true },
  });
  const currentMeta = ((integration?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
  await prisma.tenant_tumizi_integrations.update({
    where: { tenant_id: tenant.id },
    data: {
      metadata: {
        ...currentMeta,
        autoProvision: true,
        provisioning_status: 'active',
        lastError: null,
        activatedAt: new Date().toISOString(),
      } as any,
    },
  });

  return { success: true };
}

export async function processPendingTumiziProvisioning(
  limit: number = 20,
): Promise<{ processed: number; succeeded: number; failed: number; errors: string[] }> {
  const rows = await prisma.$queryRaw<Array<{ tenant_id: string; metadata: unknown }>>`
    SELECT tenant_id, metadata
    FROM tenant_tumizi_integrations
    WHERE enabled = false
      AND COALESCE(metadata->>'autoProvision', 'false') = 'true'
      AND COALESCE(metadata->>'provisioning_status', 'pending') IN ('pending', 'failed')
    ORDER BY updated_at ASC
    LIMIT ${limit}
  `;

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const integration = await prisma.tenant_tumizi_integrations.findUnique({
        where: { tenant_id: row.tenant_id },
        select: { metadata: true },
      });
      const currentMeta =
        ((integration?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
      const attempts = Number((currentMeta.attempts as number) || 0) + 1;

      await prisma.tenant_tumizi_integrations.update({
        where: { tenant_id: row.tenant_id },
        data: {
          metadata: {
            ...currentMeta,
            provisioning_status: 'processing',
            attempts,
            lastAttemptAt: new Date().toISOString(),
          } as any,
        },
      });

      const result = await provisionSingleTenant(row.tenant_id);
      if (result.success) {
        succeeded += 1;
      } else {
        failed += 1;
        errors.push(`Tenant ${row.tenant_id}: ${result.error || 'Provisioning failed'}`);
      }
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : 'Unexpected provisioning failure';
      errors.push(`Tenant ${row.tenant_id}: ${message}`);

      const integration = await prisma.tenant_tumizi_integrations.findUnique({
        where: { tenant_id: row.tenant_id },
        select: { metadata: true },
      });
      const currentMeta =
        ((integration?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
      await prisma.tenant_tumizi_integrations.update({
        where: { tenant_id: row.tenant_id },
        data: {
          metadata: {
            ...currentMeta,
            provisioning_status: 'failed',
            lastError: message,
            failedAt: new Date().toISOString(),
          } as any,
        },
      });
    }
  }

  return {
    processed: rows.length,
    succeeded,
    failed,
    errors,
  };
}
