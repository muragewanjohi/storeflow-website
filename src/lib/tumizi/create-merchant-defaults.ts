/**
 * Default field values for Tumizi partner **Create Merchant**
 * (`POST /api/partner/v1/merchants` via `tumiziClient.createMerchant`).
 *
 * Registration collects store name, admin email, phone, and subdomain; the tenant row
 * stores `name`, `contact_email`, and `store_phone` in static options before async Tumizi
 * provisioning runs.
 */

const DEFAULT_PUBLIC_BASE_HOST = 'dukanest.com';

/** merchant.country — default for stores onboarded through Storeflow. */
export const TUMIZI_DEFAULT_MERCHANT_COUNTRY = 'Kenya';

/** wallet.currency — default wallet currency for Kenyan M-Pesa / Tumizi flows. */
export const TUMIZI_DEFAULT_WALLET_CURRENCY = 'KES';

/**
 * Hostname for `merchant.domain` (public storefront URL without path or scheme).
 * Uses `NEXT_PUBLIC_BASE_DOMAIN` (e.g. `dukanest.com` or `storeflow.com`).
 */
export function buildTumiziMerchantDomainHostname(subdomain: string): string {
  const sub = (subdomain || '').trim().toLowerCase();
  const raw = (process.env.NEXT_PUBLIC_BASE_DOMAIN || DEFAULT_PUBLIC_BASE_HOST).trim();
  const host =
    raw
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      ?.replace(/:\d+$/, '')
      ?.trim() || DEFAULT_PUBLIC_BASE_HOST;
  return sub ? `${sub}.${host}` : host;
}

/**
 * merchant.description — `{storeName} Merchant` per product onboarding copy.
 */
export function buildTumiziMerchantRegistrationDescription(storeName: string): string {
  const name = (storeName || '').trim() || 'Store';
  return `${name} Merchant`;
}
