/**
 * PesaPal configuration for subscription payments
 * Uses environment variables only (never commit credentials).
 * Credentials are read at access time so scripts that load .env after startup still work.
 */

function getUseSandbox(): boolean {
  return (
    process.env.PESAPAL_USE_SANDBOX === 'true' ||
    process.env.PESAPAL_ENVIRONMENT === 'sandbox'
  );
}

const sandboxBase = 'https://cybqa.pesapal.com/pesapalv3/api';
const productionBase = 'https://pay.pesapal.com/v3/api';

export const pesapalConfig = {
  get useSandbox(): boolean {
    return getUseSandbox();
  },
  get consumerKey(): string {
    return process.env.PESAPAL_CONSUMER_KEY ?? '';
  },
  get consumerSecret(): string {
    return process.env.PESAPAL_CONSUMER_SECRET ?? '';
  },
  /** Notification ID from RegisterIPN (use after registering IPN URL once) */
  get notificationId(): string {
    return process.env.PESAPAL_NOTIFICATION_ID ?? '';
  },
  /** Yearly discount as percentage (e.g. 17 = 17% off) */
  get yearlyDiscountPercent(): number {
    return Math.min(
      100,
      Math.max(0, parseInt(process.env.PESAPAL_YEARLY_DISCOUNT_PERCENT ?? '17', 10))
    );
  },
  get urls(): {
    auth: string;
    registerIPN: string;
    submitOrder: string;
    getTransactionStatus: string;
  } {
    const useSandbox = getUseSandbox();
    const baseUrl = useSandbox ? sandboxBase : productionBase;
    return {
      auth: `${useSandbox ? sandboxBase : productionBase}/Auth/RequestToken`,
      registerIPN: `${baseUrl}/URLSetup/RegisterIPN`,
      submitOrder: `${baseUrl}/Transactions/SubmitOrderRequest`,
      getTransactionStatus: `${baseUrl}/Transactions/GetTransactionStatus`,
    };
  },
};

/**
 * Get IPN URL for subscription (default from app URL + path).
 * Uses HTTPS for non-localhost so PesaPal can reach the IPN in production.
 */
export function getPesapalIpnUrl(): string {
  const fromEnv = process.env.PESAPAL_IPN_URL;
  if (fromEnv) return fromEnv.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const base = appUrl.replace(/\/$/, '');
  const isLocalhost = /^https?:\/\/localhost(:\d+)?(\/|$)/i.test(base);
  const scheme = isLocalhost ? (base.startsWith('https') ? 'https' : 'http') : 'https';
  const withoutScheme = base.replace(/^https?:\/\//i, '');
  const ipnUrl = `${scheme}://${withoutScheme}/api/pesapal/subscription/ipn`;
  const webhookToken = process.env.PAYMENT_WEBHOOK_TOKEN?.trim();
  if (!webhookToken) {
    return ipnUrl;
  }

  const parsed = new URL(ipnUrl);
  if (!parsed.searchParams.has('token')) {
    parsed.searchParams.set('token', webhookToken);
  }
  return parsed.toString();
}

/**
 * Compute yearly price from monthly price with discount
 */
export function getYearlyPrice(monthlyPrice: number): number {
  const discount = pesapalConfig.yearlyDiscountPercent / 100;
  return Math.round(monthlyPrice * 12 * (1 - discount) * 100) / 100;
}
