import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { tumiziClient } from '../src/lib/tumizi/client';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  requiredEnv('TUMIZI_BASE_URL');
  requiredEnv('TUMIZI_PARTNER_API_KEY');

  const merchantExternalId = process.argv[2];
  if (!merchantExternalId) {
    console.error('Usage: tsx scripts/test-tumizi-connection.ts <merchant_external_id>');
    process.exit(1);
  }

  console.log('Testing Tumizi merchant wallet lookup...');
  const response = await tumiziClient.getMerchantWallet(merchantExternalId);
  console.log('Tumizi response:');
  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error('Tumizi connection test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
