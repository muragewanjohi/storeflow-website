import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { tumiziClient } from '@/lib/tumizi/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import {
  WITHDRAWAL_CHARGE_TIERS,
  getMaxWithdrawable,
  toFiniteNumber,
} from '@/lib/tumizi/wallet-withdrawal-tiers';
import {
  getErrorMessage,
  getErrorStatus,
  getTumiziMerchantExternalIdOrThrow,
} from '@/lib/tumizi/mobile-route-helpers';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const config = await getTumiziTenantConfigByTenantId(tenantId);
    const merchantExternalId = getTumiziMerchantExternalIdOrThrow(config);

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
        tenant_id: tenantId,
        gateway: 'tumizi_withdrawal',
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json(
      mobileSuccess({
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
          createdAt: row.created_at?.toISOString() ?? null,
        })),
      }),
      { status: 200 },
    );
  } catch (error) {
    const status = getErrorStatus(error);
    console.error('[Mobile Tumizi wallet GET]', error);
    return NextResponse.json(
      mobileError(
        status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        getErrorMessage(error, 'Failed to fetch Tumizi wallet details'),
      ),
      { status },
    );
  }
}
