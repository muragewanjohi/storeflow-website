import { resolvePhoneForSms } from '@/lib/phone/parse';
import {
  getUjumbeSmsMissingEnv,
  isUjumbeSmsConfigured,
  sendUjumbeSms,
} from '@/lib/sms/ujumbe-sms';
import { getStaticOptions } from '@/lib/settings/static-options';

const appName = () => process.env.NEXT_PUBLIC_APP_NAME || 'DukaNest';

function logSms(kind: string, detail: string) {
  console.log(`[SMS][${kind}] ${detail}`);
}

async function sendIfConfigured(params: {
  rawPhone: string | null | undefined;
  countryIso2: string | null | undefined;
  message: string;
  sourceId: string;
  context: string;
}): Promise<boolean> {
  const raw = params.rawPhone && String(params.rawPhone).trim();
  if (!raw) {
    console.log(`[SMS][${params.context}] Skip: no phone number provided`);
    return false;
  }
  if (!isUjumbeSmsConfigured()) {
    console.warn(
      `[SMS][${params.context}] Ujumbe not configured — set UJUMBE_SMS_* env vars. Missing:`,
      getUjumbeSmsMissingEnv().join(', ') || '(check .env.local)',
    );
    return false;
  }
  const msisdn = resolvePhoneForSms(params.countryIso2, raw);
  if (!msisdn) {
    console.warn(`[SMS][${params.context}] Skip: could not normalize phone`, {
      sourceId: params.sourceId,
      countryIso2: params.countryIso2 ?? null,
    });
    logSms('skip', 'No valid phone after normalization');
    return false;
  }

  console.log(`[SMS][${params.context}] Dispatching`, {
    sourceId: params.sourceId,
    msisdnMasked: msisdn.length >= 8 ? `${msisdn.slice(0, 3)}****${msisdn.slice(-4)}` : '****',
  });

  const result = await sendUjumbeSms({
    numbers: msisdn,
    message: params.message,
    sourceId: params.sourceId,
  });

  if (!result.ok) {
    console.error(`[SMS][${params.context}] Ujumbe send failed:`, result.error, result.status);
    return false;
  }
  console.log(`[SMS][${params.context}] Queued/sent OK`, { sourceId: params.sourceId });
  logSms('sent', params.sourceId);
  return true;
}

async function getMerchantSmsRawPhones(tenantId: string): Promise<string[]> {
  const opts = await getStaticOptions(tenantId, ['store_phone', 'store_phone_2', 'store_phone_3']);
  const raw = [opts.store_phone, opts.store_phone_2, opts.store_phone_3]
    .map((s) => (s && String(s).trim()) || null)
    .filter((v): v is string => !!v);
  return [...new Set(raw)];
}

/**
 * One Ujumbe request: `numbers` is comma-separated E.164 digits (no +), e.g. "254724511201,254733375022".
 */
async function sendUjumbeToMerchantPhones(params: {
  tenantId: string;
  countryIso2: string | null | undefined;
  message: string;
  sourceId: string;
  context: string;
}): Promise<boolean> {
  const raws = await getMerchantSmsRawPhones(params.tenantId);
  if (raws.length === 0) {
    console.log(`[SMS][${params.context}] Skip: no store phone numbers configured`, {
      sourceId: params.sourceId,
      tenantId: params.tenantId,
    });
    return false;
  }

  const seen = new Set<string>();
  const msisdns: string[] = [];
  for (const raw of raws) {
    const msisdn = resolvePhoneForSms(params.countryIso2, raw);
    if (!msisdn || seen.has(msisdn)) continue;
    seen.add(msisdn);
    msisdns.push(msisdn);
  }

  if (msisdns.length === 0) {
    console.warn(`[SMS][${params.context}] Skip: store phone values could not be normalized`, {
      sourceId: params.sourceId,
      tenantId: params.tenantId,
    });
    logSms('skip', 'No valid phone after normalization');
    return false;
  }

  if (!isUjumbeSmsConfigured()) {
    console.warn(
      `[SMS][${params.context}] Ujumbe not configured — set UJUMBE_SMS_* env vars. Missing:`,
      getUjumbeSmsMissingEnv().join(', ') || '(check .env.local)',
    );
    return false;
  }

  const numbers = msisdns.join(',');

  console.log(`[SMS][${params.context}] Dispatching (batch)`, {
    sourceId: params.sourceId,
    recipientCount: msisdns.length,
  });

  const result = await sendUjumbeSms({
    numbers,
    message: params.message,
    sourceId: params.sourceId,
  });

  if (!result.ok) {
    console.error(`[SMS][${params.context}] Ujumbe send failed:`, result.error, result.status);
    return false;
  }
  console.log(`[SMS][${params.context}] Queued/sent OK`, { sourceId: params.sourceId });
  logSms('sent', params.sourceId);
  return true;
}

/**
 * Registration welcome — `adminPhoneE164` is digits-only international (no +).
 * SMS is skipped if the user did not provide a phone at registration.
 */
export async function sendRegistrationSms(params: {
  tenantId: string;
  adminPhoneE164: string;
  storeName: string;
  /** Public storefront URL (e.g. https://mysub.dukanest.com/) */
  storeUrl: string;
}): Promise<boolean> {
  console.log('[SMS][registration] Welcome SMS requested', {
    tenantId: params.tenantId,
    storeName: params.storeName,
    storeUrl: params.storeUrl,
    ujumbeConfigured: isUjumbeSmsConfigured(),
  });
  const msg = `Your registration for ${appName()} is complete. Store: ${params.storeName}. Your store: ${params.storeUrl}`;
  const ok = await sendIfConfigured({
    rawPhone: params.adminPhoneE164,
    countryIso2: 'KE',
    message: msg,
    sourceId: `reg_${params.tenantId}_${Date.now()}`,
    context: 'registration-welcome',
  });
  console.log('[SMS][registration] Welcome SMS finished', { tenantId: params.tenantId, success: ok });
  return ok;
}

/**
 * New order alert — one API call; all store numbers in `numbers` comma-separated.
 * SMS is sent only when at least one valid store phone (`store_phone`, `store_phone_2`, `store_phone_3`) is set.
 */
export async function sendNewOrderSmsToMerchant(params: {
  tenantId: string;
  countryIso2: string | null | undefined;
  orderNumber: string;
  storeName: string;
  totalLabel: string;
  ordersUrl: string;
}): Promise<boolean> {
  const msg = `New order: ${params.orderNumber} at ${params.storeName}. Amount: ${params.totalLabel}. Manage it here: ${params.ordersUrl}`;
  return sendUjumbeToMerchantPhones({
    tenantId: params.tenantId,
    countryIso2: params.countryIso2,
    message: msg,
    sourceId: `order_${params.tenantId}_${params.orderNumber}_${Date.now()}`,
    context: 'new-order',
  });
}

/** SMS only if merchant has configured store phone number(s). */
export async function sendSubscriptionRenewalReminderSms(params: {
  tenantId: string;
  countryIso2: string | null | undefined;
  storeName: string;
  daysLeft: number;
}): Promise<boolean> {
  const msg = `${appName()}: Hi ${params.storeName}, your subscription expires in ${params.daysLeft} day(s). Please renew to avoid interruption.`;
  return sendUjumbeToMerchantPhones({
    tenantId: params.tenantId,
    countryIso2: params.countryIso2,
    message: msg,
    sourceId: `renew_${params.tenantId}_${Date.now()}`,
    context: 'subscription-renewal',
  });
}

/** SMS only if merchant has configured store phone number(s). */
export async function sendPaymentDueReminderSms(params: {
  tenantId: string;
  countryIso2: string | null | undefined;
  storeName: string;
}): Promise<boolean> {
  const msg = `${appName()}: Hi ${params.storeName}, payment is due on your subscription. Please complete payment to keep your store active.`;
  return sendUjumbeToMerchantPhones({
    tenantId: params.tenantId,
    countryIso2: params.countryIso2,
    message: msg,
    sourceId: `paydue_${params.tenantId}_${Date.now()}`,
    context: 'payment-due',
  });
}

/**
 * Sent when the merchant completes “Delete my account” (same phones as order/subscription SMS).
 * SMS is skipped when no store phone numbers are configured.
 */
export async function sendAccountDeletionConfirmationSms(params: {
  tenantId: string;
  countryIso2: string | null | undefined;
  storeName: string;
  retentionDays: number;
}): Promise<boolean> {
  const msg = `${appName()}: Your store "${params.storeName}" has been deactivated and is scheduled for permanent deletion in ${params.retentionDays} day(s). Contact support if this was a mistake.`;
  return sendUjumbeToMerchantPhones({
    tenantId: params.tenantId,
    countryIso2: params.countryIso2,
    message: msg,
    sourceId: `del_${params.tenantId}_${Date.now()}`,
    context: 'account-deletion',
  });
}
