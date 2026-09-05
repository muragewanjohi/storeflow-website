import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { tumiziClient } from '../src/lib/tumizi/client';
import { buildTumiziAccountReference } from '../src/lib/tumizi/references';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

function usage(): never {
  console.error(
    'Usage: tsx scripts/tumizi-test-customer-payment.ts <merchant_external_id> <store_name> <phone_number> <amount> [invoice]',
  );
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function main() {
  const merchantExternalId = process.argv[2];
  const storeName = process.argv[3];
  const phoneNumber = process.argv[4];
  const amount = Number(process.argv[5]);
  const invoice = process.argv[6] || '01';

  if (!merchantExternalId || !storeName || !phoneNumber || !Number.isFinite(amount) || amount <= 0) {
    usage();
  }

  const externalReference = `cp${Date.now()}`;
  const accountReference = buildTumiziAccountReference(storeName, invoice);

  const create = await tumiziClient.createCustomerPayment({
    merchant_external_id: merchantExternalId,
    external_reference: externalReference,
    account_reference: accountReference,
    phone_number: phoneNumber,
    amount,
    currency: 'KES',
    description: `Storeflow customer payment test for ${storeName}`,
    payer: {
      name: 'Test Customer',
      email: 'test.customer@example.com',
      phone_number: phoneNumber,
    },
  });

  console.log('Create payment response:');
  console.log(
    JSON.stringify(
      {
        externalReference,
        accountReference,
        create,
      },
      null,
      2,
    ),
  );

  // Optional short polling for quick operator feedback.
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const status = await fetch(
      `${process.env.TUMIZI_BASE_URL?.replace(/\/$/, '')}/api/partner/v1/customer-payments/${encodeURIComponent(
        externalReference,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TUMIZI_PARTNER_API_KEY}`,
        },
      },
    ).then(async (res) => {
      const text = await res.text();
      let body: unknown = {};
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
      return { http: res.status, body };
    });

    console.log(`Status poll #${attempt}:`);
    console.log(JSON.stringify(status, null, 2));

    const currentStatus = (status.body as any)?.data?.status as string | undefined;
    if (currentStatus && ['succeeded', 'failed', 'cancelled', 'completed'].includes(currentStatus.toLowerCase())) {
      break;
    }
    if (attempt < 4) {
      await sleep(4000);
    }
  }
}

main().catch((error) => {
  console.error(
    'Tumizi customer payment test failed:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
