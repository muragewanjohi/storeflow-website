import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { prisma } from '../src/lib/prisma/client';
import { tumiziClient } from '../src/lib/tumizi/client';
import {
  getTumiziTenantConfigByTenantId,
  upsertTumiziTenantConfig,
} from '../src/lib/tumizi/config';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

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

function parseArgs() {
  const subdomain = process.argv[2];
  if (!subdomain) {
    throw new Error(
      'Usage: tsx scripts/enable-tumizi-store.ts <tenant_subdomain> [--create-merchant]',
    );
  }
  return {
    subdomain: subdomain.toLowerCase(),
    createMerchant: process.argv.includes('--create-merchant'),
  };
}

function getWebhookUrl(): string | null {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '').trim();
  const token = (process.env.PAYMENT_WEBHOOK_TOKEN || '').trim();
  if (!baseUrl || !token) return null;

  const normalized = baseUrl.startsWith('http')
    ? baseUrl.replace(/\/$/, '')
    : `https://${baseUrl.replace(/\/$/, '')}`;
  return `${normalized}/api/tumizi/webhook?token=${encodeURIComponent(token)}`;
}

async function main() {
  const { subdomain, createMerchant } = parseArgs();

  const tenant = await prisma.tenants.findFirst({
    where: { subdomain, deleted_at: null },
    select: { id: true, name: true, subdomain: true, contact_email: true },
  });

  if (!tenant) {
    throw new Error(`Tenant not found for subdomain: ${subdomain}`);
  }

  const current = (await getTumiziTenantConfigByTenantId(tenant.id)) ?? { enabled: false };
  const merchantExternalId = current.merchantExternalId || `storeflow-${tenant.id}`;
  const webhookUrl = getWebhookUrl();
  const storePhoneOption = await prisma.static_options.findUnique({
    where: {
      tenant_id_option_name: {
        tenant_id: tenant.id,
        option_name: 'store_phone',
      },
    },
    select: { option_value: true },
  });

  if (createMerchant) {
    const ownerEmail = tenant.contact_email || 'support@dukanest.com';
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
      ...(webhookUrl
        ? {
            webhooks: [
              {
                name: 'Storeflow Tumizi Webhook',
                callback_url: webhookUrl,
                events: [
                  'partner.customer_payment.updated',
                  'partner.withdrawal.updated',
                  'partner.refund.updated',
                ],
              },
            ],
          }
        : {}),
    });
    console.log(`Merchant created in Tumizi: ${merchantExternalId}`);
  }

  const wallet = await tumiziClient.getMerchantWallet(merchantExternalId).catch(() => null);
  const walletRecord = (wallet?.wallet as Record<string, unknown> | undefined) || {};

  const nextConfig = {
    enabled: true,
    merchantExternalId,
    walletAccountNumber:
      typeof walletRecord.account_number === 'string'
        ? walletRecord.account_number
        : current.walletAccountNumber,
    walletCurrency:
      typeof walletRecord.currency === 'string' ? walletRecord.currency : current.walletCurrency,
    webhookUrl: webhookUrl ?? current.webhookUrl,
    webhookEvents: [
      'partner.customer_payment.updated',
      'partner.withdrawal.updated',
      'partner.refund.updated',
    ],
    lastSyncedAt: new Date().toISOString(),
  };

  const saved = await upsertTumiziTenantConfig(tenant.id, nextConfig);

  console.log('Tumizi enabled successfully:');
  console.log(
    JSON.stringify(
      {
        tenantId: tenant.id,
        subdomain: tenant.subdomain,
        ...saved,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Failed to enable Tumizi store:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
