import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { tumiziClient } from '../src/lib/tumizi/client';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

function usage(): never {
  console.error(
    'Usage: tsx scripts/tumizi-create-merchant.ts <merchant_external_id> <merchant_name> [owner_email] [owner_name] [merchant_phone]',
  );
  process.exit(1);
}

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

async function main() {
  const merchantExternalId = process.argv[2];
  const merchantName = process.argv[3];
  const ownerEmail = process.argv[4] || 'support@dukanest.com';
  const ownerName = process.argv[5] || 'Store Owner';
  const merchantPhone = normalizeMerchantPhone(process.argv[6]);

  if (!merchantExternalId || !merchantName) {
    usage();
  }

  const webhookToken = (process.env.PAYMENT_WEBHOOK_TOKEN || '').trim();
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://dukanest.com').trim();
  const normalizedBase = appBaseUrl.startsWith('http') ? appBaseUrl : `https://${appBaseUrl}`;
  const webhookUrl = webhookToken
    ? `${normalizedBase.replace(/\/$/, '')}/api/tumizi/webhook?token=${encodeURIComponent(webhookToken)}`
    : undefined;

  const walletAccountNumber = merchantExternalId
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16) || `STORE${Date.now().toString().slice(-6)}`;

  const payload = {
    merchant_external_id: merchantExternalId,
    merchant: {
      name: merchantName,
      email: ownerEmail,
      phone: merchantPhone,
      country: 'Kenya',
      domain: `${merchantExternalId}.dukanest.com`,
      description: `Storeflow merchant for ${merchantName}`,
    },
    owner: {
      name: ownerName,
      email: ownerEmail,
    },
    wallet: {
      name: 'Main Wallet',
      account_number: walletAccountNumber,
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
  };

  console.log('Creating Tumizi merchant...');
  const create = await tumiziClient.createMerchant(payload);
  console.log('Create merchant response:');
  console.log(JSON.stringify(create, null, 2));

  const wallet = await tumiziClient.getMerchantWallet(merchantExternalId);
  console.log('Merchant wallet response:');
  console.log(JSON.stringify(wallet, null, 2));
}

main().catch((error) => {
  console.error('Tumizi create merchant failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
