import { prisma } from '@/lib/prisma/client';

export interface TumiziTenantConfig {
  enabled: boolean;
  merchantExternalId?: string;
  walletAccountNumber?: string;
  walletCurrency?: string;
  webhookUrl?: string;
  webhookEvents?: string[];
  lastSyncedAt?: string;
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function readTumiziTenantConfig(data: unknown): TumiziTenantConfig {
  const root = toObject(data);
  const tumizi = toObject(root.tumizi);

  return {
    enabled: Boolean(tumizi.enabled),
    merchantExternalId:
      typeof tumizi.merchantExternalId === 'string' ? tumizi.merchantExternalId : undefined,
    walletAccountNumber:
      typeof tumizi.walletAccountNumber === 'string' ? tumizi.walletAccountNumber : undefined,
    walletCurrency: typeof tumizi.walletCurrency === 'string' ? tumizi.walletCurrency : undefined,
    webhookUrl: typeof tumizi.webhookUrl === 'string' ? tumizi.webhookUrl : undefined,
    webhookEvents: Array.isArray(tumizi.webhookEvents)
      ? tumizi.webhookEvents.filter((x): x is string => typeof x === 'string')
      : undefined,
    lastSyncedAt: typeof tumizi.lastSyncedAt === 'string' ? tumizi.lastSyncedAt : undefined,
  };
}

export function withTumiziTenantConfig(
  data: unknown,
  config: TumiziTenantConfig,
): Record<string, unknown> {
  const root = toObject(data);
  return {
    ...root,
    tumizi: {
      enabled: config.enabled,
      merchantExternalId: config.merchantExternalId ?? null,
      walletAccountNumber: config.walletAccountNumber ?? null,
      walletCurrency: config.walletCurrency ?? null,
      webhookUrl: config.webhookUrl ?? null,
      webhookEvents: config.webhookEvents ?? null,
      lastSyncedAt: config.lastSyncedAt ?? new Date().toISOString(),
    },
  };
}

function parseWebhookEvents(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export async function getTumiziTenantConfigByTenantId(tenantId: string): Promise<TumiziTenantConfig | null> {
  const integration = await prisma.tenant_tumizi_integrations.findUnique({
    where: { tenant_id: tenantId },
  });

  if (integration) {
    const metadata = toObject(integration.metadata);
    return {
      enabled: Boolean(integration.enabled),
      merchantExternalId: integration.merchant_external_id ?? undefined,
      walletAccountNumber: integration.wallet_account_number ?? undefined,
      walletCurrency: integration.wallet_currency ?? undefined,
      webhookUrl: integration.webhook_url ?? undefined,
      webhookEvents: parseWebhookEvents(integration.webhook_events),
      lastSyncedAt:
        typeof metadata.lastSyncedAt === 'string'
          ? metadata.lastSyncedAt
          : integration.updated_at?.toISOString(),
    };
  }

  // Backward-compatibility fallback while old JSON data still exists.
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { data: true },
  });
  const legacy = readTumiziTenantConfig(tenant?.data);
  return legacy.enabled || legacy.merchantExternalId ? legacy : null;
}

export async function upsertTumiziTenantConfig(
  tenantId: string,
  config: TumiziTenantConfig,
): Promise<TumiziTenantConfig> {
  const now = new Date().toISOString();
  const webhookEvents = config.webhookEvents ?? [];

  const integration = await prisma.tenant_tumizi_integrations.upsert({
    where: { tenant_id: tenantId },
    update: {
      enabled: config.enabled,
      merchant_external_id: config.merchantExternalId ?? null,
      wallet_account_number: config.walletAccountNumber ?? null,
      wallet_currency: config.walletCurrency ?? null,
      webhook_url: config.webhookUrl ?? null,
      webhook_events: webhookEvents as any,
      metadata: {
        lastSyncedAt: config.lastSyncedAt ?? now,
      },
    },
    create: {
      tenant_id: tenantId,
      enabled: config.enabled,
      merchant_external_id: config.merchantExternalId ?? null,
      wallet_account_number: config.walletAccountNumber ?? null,
      wallet_currency: config.walletCurrency ?? null,
      webhook_url: config.webhookUrl ?? null,
      webhook_events: webhookEvents as any,
      metadata: {
        lastSyncedAt: config.lastSyncedAt ?? now,
      },
    },
  });

  // Keep legacy JSON mirror during transition period.
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { data: true },
  });
  const mirrored = withTumiziTenantConfig(tenant?.data, {
    ...config,
    webhookEvents,
    lastSyncedAt: config.lastSyncedAt ?? now,
  });
  await prisma.tenants.update({
    where: { id: tenantId },
    data: { data: mirrored as any },
  });

  const metadata = toObject(integration.metadata);
  return {
    enabled: Boolean(integration.enabled),
    merchantExternalId: integration.merchant_external_id ?? undefined,
    walletAccountNumber: integration.wallet_account_number ?? undefined,
    walletCurrency: integration.wallet_currency ?? undefined,
    webhookUrl: integration.webhook_url ?? undefined,
    webhookEvents: parseWebhookEvents(integration.webhook_events),
    lastSyncedAt:
      typeof metadata.lastSyncedAt === 'string'
        ? metadata.lastSyncedAt
        : integration.updated_at?.toISOString(),
  };
}

export async function findTenantIdByTumiziMerchantExternalId(
  merchantExternalId: string,
): Promise<string | null> {
  if (!merchantExternalId) {
    return null;
  }

  const integration = await prisma.tenant_tumizi_integrations.findUnique({
    where: { merchant_external_id: merchantExternalId },
    select: { tenant_id: true },
  });
  if (integration?.tenant_id) {
    return integration.tenant_id;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM tenants
      WHERE data->'tumizi'->>'merchantExternalId' = ${merchantExternalId}
        AND deleted_at IS NULL
      LIMIT 1
    `;

  return rows[0]?.id ?? null;
}
