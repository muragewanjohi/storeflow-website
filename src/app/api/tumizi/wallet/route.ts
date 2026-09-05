import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { tumiziClient } from '@/lib/tumizi/client';
import { prisma } from '@/lib/prisma/client';
import {
  WITHDRAWAL_CHARGE_TIERS,
  toFiniteNumber,
  getChargeForAmount,
  getMaxWithdrawable,
} from '@/lib/tumizi/wallet-withdrawal-tiers';

const withdrawalSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  amount: z.coerce.number().positive(),
  narration: z.string().max(255).optional(),
});

function normalizeKenyaPhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  return null;
}

function getMerchantExternalIdOrThrow(config: Awaited<ReturnType<typeof getTumiziTenantConfigByTenantId>>) {
  if (!config?.enabled || !config.merchantExternalId) {
    const error = new Error('Tumizi is not enabled for this store');
    (error as any).status = 400;
    throw error;
  }
  return config.merchantExternalId;
}

export async function GET() {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();

    const config = await getTumiziTenantConfigByTenantId(tenant.id);
    const merchantExternalId = getMerchantExternalIdOrThrow(config);

    const walletResponse = await tumiziClient.getMerchantWallet(merchantExternalId);
    const walletData =
      ((walletResponse.data as Record<string, unknown> | undefined)?.wallet as
        | Record<string, unknown>
        | undefined) ||
      ((walletResponse.wallet as Record<string, unknown> | undefined) ?? {});

    const availableBalance = toFiniteNumber(walletData.available_balance);
    const maxWithdrawable = getMaxWithdrawable(availableBalance);
    const recentWithdrawals = await prisma.payment_logs.findMany({
      where: {
        tenant_id: tenant.id,
        gateway: 'tumizi_withdrawal',
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: {
        merchantExternalId,
        wallet: walletData,
        availableBalance,
        maxWithdrawableAmount: maxWithdrawable.amount,
        maxWithdrawableCharge: maxWithdrawable.charge,
        chargeTiers: WITHDRAWAL_CHARGE_TIERS,
        recentWithdrawals: recentWithdrawals.map((row) => ({
          id: row.id,
          amount: Number(row.amount),
          currency: row.currency,
          status: row.status,
          externalReference: row.payment_id,
          withdrawalReference: row.transaction_id,
          createdAt: row.created_at,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch wallet details' },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();
    const payload = withdrawalSchema.parse(await request.json());

    const config = await getTumiziTenantConfigByTenantId(tenant.id);
    const merchantExternalId = getMerchantExternalIdOrThrow(config);
    const normalizedPhone = normalizeKenyaPhone(payload.phoneNumber);
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid Kenya M-Pesa phone number (e.g. 2547XXXXXXXX).' },
        { status: 400 },
      );
    }

    const withdrawalCharge = getChargeForAmount(payload.amount);
    const externalReference = `wallet-withdrawal-${tenant.id}-${Date.now()}`;
    const response = await tumiziClient.createWithdrawal({
      merchant_external_id: merchantExternalId,
      external_reference: externalReference,
      phone_number: normalizedPhone,
      amount: payload.amount,
      currency: 'KES',
      narration: payload.narration || 'Wallet withdrawal to M-Pesa',
    });

    const withdrawalReference =
      (response?.data as Record<string, unknown> | undefined)?.withdrawal_reference ||
      response['withdrawal_reference'];

    await prisma.payment_logs.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        gateway: 'tumizi_withdrawal',
        amount: payload.amount,
        currency: 'KES',
        status: 'pending',
        payment_id: externalReference,
        transaction_id: typeof withdrawalReference === 'string' ? withdrawalReference : null,
        metadata: {
          source: 'tumizi_wallet_withdrawal',
          merchant_external_id: merchantExternalId,
          withdrawal_charge: withdrawalCharge,
          phone_number: normalizedPhone,
          external_reference: externalReference,
          response,
        } as any,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        externalReference,
        withdrawalCharge,
        response,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create wallet withdrawal' },
      { status: error.status || 500 },
    );
  }
}
