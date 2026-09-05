import { z } from 'zod';
import type { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';

export const updateTumiziMerchantSchema = z.object({
  merchant: z
    .object({
      name: z.string().min(1).max(255).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(7).max(30).optional(),
      country: z.string().min(2).max(120).optional(),
      description: z.string().max(255).optional(),
      status: z.string().min(3).max(40).optional(),
    })
    .optional(),
  owner: z
    .object({
      name: z.string().min(1).max(255).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  wallet: z
    .object({
      name: z.string().min(1).max(255).optional(),
      account_number: z.string().min(3).max(40).optional(),
      currency: z.string().min(3).max(10).optional(),
    })
    .optional(),
  status: z.string().min(3).max(40).optional(),
});

export const tumiziWithdrawalSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  amount: z.coerce.number().positive(),
  narration: z.string().max(255).optional(),
});

export function getTumiziMerchantExternalIdOrThrow(
  config: Awaited<ReturnType<typeof getTumiziTenantConfigByTenantId>>,
): string {
  if (!config?.enabled || !config.merchantExternalId) {
    const error = new Error('Tumizi is not enabled for this store');
    (error as { status?: number }).status = 400;
    throw error;
  }
  return config.merchantExternalId;
}

export function normalizeKenyaTumiziPhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  return null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getErrorStatus(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    const status = (error as { status: number }).status;
    return status >= 400 && status < 600 ? status : 500;
  }
  return 500;
}
