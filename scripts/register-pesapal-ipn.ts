/**
 * One-time script to register PesaPal IPN URL and get notification_id.
 * Run: npx tsx scripts/register-pesapal-ipn.ts
 * Then set PESAPAL_NOTIFICATION_ID in your .env from the printed ipn_id.
 *
 * Env must be loaded before PesaPal modules (they read process.env at load time).
 */

import { resolve } from 'path';
import * as dotenv from 'dotenv';

const envPath = resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath, override: true });
dotenv.config({ path: resolve(process.cwd(), '.env'), override: true });

const hasKey = Boolean(process.env.PESAPAL_CONSUMER_KEY);
const hasSecret = Boolean(process.env.PESAPAL_CONSUMER_SECRET);
if (!hasKey || !hasSecret) {
  console.error('PesaPal: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set.');
  console.error('Add them to .env.local (see .env.example) and save the file, then run this script again from the project root.');
  console.error('Loaded .env.local from:', envPath);
  process.exit(1);
}

async function main() {
  const { registerIPN } = await import('../src/lib/pesapal/pesapal-service');
  const { getPesapalIpnUrl } = await import('../src/lib/pesapal/config');
  const ipnUrl = getPesapalIpnUrl();
  console.log('Registering IPN URL:', ipnUrl);
  const result = await registerIPN(ipnUrl, 'POST');
  console.log('Success! Add to your .env:');
  console.log(`PESAPAL_NOTIFICATION_ID=${result.ipn_id}`);
  console.log('IPN URL registered:', result.url);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
