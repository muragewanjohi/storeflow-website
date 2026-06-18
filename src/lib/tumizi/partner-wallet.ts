import { tumiziClient } from '@/lib/tumizi/client';

function readWalletAccountNumber(response: Record<string, unknown>): string | undefined {
  const data = response.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }
  const account = (data as Record<string, unknown>).wallet_account_number;
  return typeof account === 'string' && account.trim() ? account.trim() : undefined;
}

/**
 * Partner-self subscription payments require the DukaNest platform wallet account number.
 */
export async function resolveTumiziPartnerWalletAccountNumber(): Promise<string> {
  const fromEnv = (process.env.TUMIZI_PARTNER_WALLET_ACCOUNT_NUMBER || '').trim();
  if (fromEnv) {
    return fromEnv;
  }

  const wallet = await tumiziClient.getPartnerWallet();
  const accountNumber = readWalletAccountNumber(wallet);
  if (!accountNumber) {
    throw new Error('Tumizi partner wallet is not configured');
  }

  return accountNumber;
}
