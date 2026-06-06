import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { tumiziClient } from '@/lib/tumizi/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import {
  buildTumiziMerchantBundle,
  buildTumiziWalletPayload,
} from '@/lib/tumizi/merchant-general-info';
import {
  WITHDRAWAL_CHARGE_TIERS,
  getMaxWithdrawable,
  getMinimumWithdrawalWithCharge,
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

    const [walletResponse, merchantResponse] = await Promise.all([
      tumiziClient.getMerchantWallet(merchantExternalId),
      tumiziClient.getMerchant(merchantExternalId).catch(() => null),
    ]);

    const merchantBundle = merchantResponse
      ? buildTumiziMerchantBundle(merchantExternalId, merchantResponse, walletResponse)
      : null;

    const walletView = buildTumiziWalletPayload({
      merchantExternalId,
      walletResponse,
      merchantBundle,
      configWalletAccountNumber: config?.walletAccountNumber,
      configWalletCurrency: config?.walletCurrency,
    });

    const maxWithdrawable = getMaxWithdrawable(walletView.availableBalance);
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
        wallet: walletView.wallet,
        walletAccountNumber: walletView.walletAccountNumber,
        walletCurrency: walletView.walletCurrency,
        availableBalance: walletView.availableBalance,
        balanceSource: walletView.balanceSource,
        maxWithdrawableAmount: maxWithdrawable.amount,
        maxWithdrawableCharge: maxWithdrawable.charge,
        minimumWithdrawalAmount: getMinimumWithdrawalWithCharge(),
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
