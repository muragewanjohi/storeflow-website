/**
 * Normalizes Tumizi "get merchant" (and optional wallet) payloads for the dashboard.
 * Supports flat `data` objects and nested `{ data: { merchant: {...}, owner: {...} } }` shapes.
 */

export type TumiziGeneralInfoView = {
  merchantId: string;
  merchantExternalId: string;
  status: string;
  organisationId: string;
  organisationName: string;
  organisationDomain: string;
  walletId: string;
  walletName: string;
  walletAccountNumber: string;
  walletCurrency: string;
  availableBalanceLabel: string;
  ownerName: string;
  ownerEmail: string;
  merchantContactName: string;
  merchantContactEmail: string;
  merchantContactPhone: string;
  merchantCountry: string;
  merchantDescription: string;
};

function str(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function dash(v: string): string {
  return v || '-';
}

function readEnvelope(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  const o = obj as Record<string, unknown>;
  if (o.data !== undefined && o.data !== null && typeof o.data === 'object') {
    return o.data as Record<string, unknown>;
  }
  return o;
}

function nestedRecord(o: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = o[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function formatMoneyAmount(currency: string, raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '-';
  const n = Number(raw);
  if (!Number.isFinite(n)) return str(raw) || '-';
  const cur = currency || 'KES';
  return `${cur} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function buildTumiziGeneralInfoView(merchantData: Record<string, any> | null): TumiziGeneralInfoView | null {
  if (!merchantData?.merchant) return null;

  const merchantRes = merchantData.merchant as Record<string, unknown>;
  const inner = readEnvelope(merchantRes);
  const nestedMerchant = nestedRecord(inner, 'merchant');

  const walletEnvelope = merchantData.wallet ? readEnvelope(merchantData.wallet) : {};
  const nestedWallet = nestedRecord(walletEnvelope, 'wallet') ?? (walletEnvelope as Record<string, unknown>);

  const owner = nestedRecord(inner, 'owner');

  const organisationName =
    str(inner.organisation_name) || str(inner.organization_name) || str(nestedMerchant?.organisation_name);
  const organisationDomain =
    str(inner.organisation_domain) || str(inner.organization_domain) || str(nestedMerchant?.organisation_domain);
  const organisationId =
    str(inner.organisation_id) || str(inner.organization_id) || str(nestedMerchant?.organisation_id);

  const merchantExternalId =
    str(inner.merchant_external_id) ||
    str(merchantData.merchantExternalId) ||
    str(nestedMerchant?.merchant_external_id);

  const merchantId = str(inner.merchant_id) || str(nestedMerchant?.merchant_id);
  const status = str(inner.status) || str(nestedMerchant?.status) || 'active';

  const walletId =
    str(inner.wallet_id) || str(nestedWallet.wallet_id) || str((nestedWallet as { id?: unknown }).id);
  const walletName =
    str(inner.wallet_name) || str(nestedWallet.name) || str(nestedWallet.wallet_name);
  const walletAccountNumber =
    str(inner.wallet_account_number) || str(nestedWallet.account_number) || str(nestedWallet.account_number);
  const walletCurrency =
    str(inner.wallet_currency) || str(nestedWallet.currency) || str(nestedWallet.currency) || 'KES';

  const balanceRaw =
    inner.available_balance ?? nestedWallet.available_balance ?? walletEnvelope.available_balance;

  const merchantContactName =
    str(nestedMerchant?.name) || str(inner.name) || organisationName;
  const merchantContactEmail = str(nestedMerchant?.email) || str(inner.email);
  const merchantContactPhone = str(nestedMerchant?.phone) || str(inner.phone);
  const merchantCountry = str(nestedMerchant?.country) || str(inner.country);
  const merchantDescription = str(nestedMerchant?.description) || str(inner.description);

  const ownerName = str(owner?.name);
  const ownerEmail = str(owner?.email);

  return {
    merchantId: dash(merchantId),
    merchantExternalId: dash(merchantExternalId),
    status: dash(status),
    organisationId: dash(organisationId),
    organisationName: dash(organisationName),
    organisationDomain: dash(organisationDomain),
    walletId: dash(walletId),
    walletName: dash(walletName),
    walletAccountNumber: dash(walletAccountNumber),
    walletCurrency: dash(walletCurrency),
    availableBalanceLabel: formatMoneyAmount(walletCurrency, balanceRaw),
    ownerName: dash(ownerName),
    ownerEmail: dash(ownerEmail),
    merchantContactName: dash(merchantContactName),
    merchantContactEmail: dash(merchantContactEmail),
    merchantContactPhone: dash(merchantContactPhone),
    merchantCountry: dash(merchantCountry),
    merchantDescription: dash(merchantDescription),
  };
}

/** Wallet fields derived from the same GET merchant payload used on General Information (cached). */
export type TumiziCachedWalletSnapshot = {
  availableBalance: number;
  accountNumber: string;
  currency: string;
};

export function getWalletSnapshotFromMerchantData(
  merchantData: Record<string, any> | null,
): TumiziCachedWalletSnapshot | null {
  if (!merchantData?.merchant) return null;
  const merchantRes = merchantData.merchant as Record<string, unknown>;
  const inner = readEnvelope(merchantRes);
  const walletEnvelope = merchantData.wallet ? readEnvelope(merchantData.wallet) : {};
  const nestedWallet = nestedRecord(walletEnvelope, 'wallet') ?? (walletEnvelope as Record<string, unknown>);

  const balanceRaw =
    inner.available_balance ?? nestedWallet.available_balance ?? walletEnvelope.available_balance;
  const n = Number(balanceRaw);
  const availableBalance = Number.isFinite(n) ? n : 0;

  const accountNumber =
    str(inner.wallet_account_number) ||
    str(nestedWallet.account_number) ||
    str(nestedWallet.account_number);
  const currency =
    str(inner.wallet_currency) || str(nestedWallet.currency) || str(nestedWallet.currency) || 'KES';

  return {
    availableBalance,
    accountNumber,
    currency,
  };
}
