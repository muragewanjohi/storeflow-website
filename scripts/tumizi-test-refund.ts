import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { tumiziClient } from '../src/lib/tumizi/client';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

function usage(): never {
  console.error(
    'Usage: tsx scripts/tumizi-test-refund.ts <merchant_external_id> <payment_reference> [reason]',
  );
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function main() {
  const merchantExternalId = process.argv[2];
  const paymentReference = process.argv[3];
  const reason = process.argv[4] || 'Storeflow Tumizi refund test';

  if (!merchantExternalId || !paymentReference) {
    usage();
  }

  const externalReference = `refund${Date.now()}`;

  const create = await tumiziClient.createMerchantRefund({
    merchant_external_id: merchantExternalId,
    external_reference: externalReference,
    payment_reference: paymentReference,
    reason,
  });

  console.log('Create refund response:');
  console.log(
    JSON.stringify(
      {
        externalReference,
        paymentReference,
        create,
      },
      null,
      2,
    ),
  );

  // Optional short polling for quick operator feedback.
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const status = await fetch(
      `${process.env.TUMIZI_BASE_URL?.replace(/\/$/, '')}/api/partner/v1/refunds/${encodeURIComponent(
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

    console.log(`Refund status poll #${attempt}:`);
    console.log(JSON.stringify(status, null, 2));

    const currentStatus = (status.body as any)?.data?.status as string | undefined;
    if (
      currentStatus &&
      ['succeeded', 'failed', 'cancelled', 'completed', 'successful'].includes(
        currentStatus.toLowerCase(),
      )
    ) {
      break;
    }
    if (attempt < 4) {
      await sleep(4000);
    }
  }
}

main().catch((error) => {
  console.error('Tumizi refund test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
