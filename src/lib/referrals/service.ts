import { prisma } from '@/lib/prisma/client';

const REFERRAL_REWARD_MONTHS = 1;

function normalizeReferrerSubdomain(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function resolveActiveReferrerBySubdomain(subdomain: string) {
  const normalized = normalizeReferrerSubdomain(subdomain);
  if (!normalized) return null;

  return prisma.tenants.findFirst({
    where: {
      subdomain: normalized,
      deleted_at: null,
      status: 'active',
    },
    select: { id: true, subdomain: true },
  });
}

function addMonths(base: Date, months: number): Date {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function createTenantReferralAttribution(input: {
  referrerSubdomain: string;
  referredTenantId: string;
  referredSubdomain?: string;
}): Promise<{ created: boolean; reason?: string }> {
  const referrerSubdomain = normalizeReferrerSubdomain(input.referrerSubdomain);
  const referredSubdomain = input.referredSubdomain
    ? normalizeReferrerSubdomain(input.referredSubdomain)
    : undefined;

  if (referredSubdomain && referrerSubdomain === referredSubdomain) {
    return { created: false, reason: 'Self-referral is not allowed' };
  }

  const referrer = await resolveActiveReferrerBySubdomain(referrerSubdomain);

  if (!referrer) {
    return { created: false, reason: 'Referrer store not found or inactive' };
  }

  if (referrer.id === input.referredTenantId) {
    return { created: false, reason: 'Self-referral is not allowed' };
  }

  try {
    await prisma.tenant_referrals.create({
      data: {
        referrer_tenant_id: referrer.id,
        referred_tenant_id: input.referredTenantId,
        referral_identifier: referrer.subdomain,
        status: 'pending',
        reward_months: REFERRAL_REWARD_MONTHS,
      },
    });
    return { created: true };
  } catch (error) {
    // Unique constraints enforce one referral record per referred tenant.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { created: false, reason: 'Referral already attributed' };
    }
    throw error;
  }
}

async function getCompletedSubscriptionPaymentsCount(
  tx: Pick<typeof prisma, '$queryRaw'>,
  referredTenantId: string,
): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*)::bigint AS total
    FROM payment_logs
    WHERE tenant_id = ${referredTenantId}
      AND status = 'completed'
      AND gateway IN ('mpesa_buy_goods', 'pesapal')
      AND metadata ? 'plan_id'
  `;

  return Number(rows[0]?.total ?? 0);
}

export async function processReferralRewardForReferredTenant(input: {
  referredTenantId: string;
  paymentLogId?: string;
}): Promise<{ rewarded: boolean; reason?: string }> {
  const referral = await prisma.tenant_referrals.findUnique({
    where: { referred_tenant_id: input.referredTenantId },
    select: {
      id: true,
      status: true,
      referrer_tenant_id: true,
      referred_tenant_id: true,
      reward_months: true,
    },
  });

  if (!referral) {
    return { rewarded: false, reason: 'No referral attribution found' };
  }

  if (referral.status === 'rewarded' || referral.status === 'rejected') {
    return { rewarded: false, reason: `Referral already ${referral.status}` };
  }

  const completedSubscriptionPayments = await getCompletedSubscriptionPaymentsCount(
    prisma,
    input.referredTenantId,
  );

  // Qualify only on the first successful paid subscription cycle.
  if (completedSubscriptionPayments !== 1) {
    return {
      rewarded: false,
      reason: `Not first paid cycle (count=${completedSubscriptionPayments})`,
    };
  }

  const now = new Date();
  const rewardMonths = referral.reward_months ?? REFERRAL_REWARD_MONTHS;

  await prisma.$transaction(async (tx) => {
    const referralForUpdate = await tx.tenant_referrals.findUnique({
      where: { referred_tenant_id: input.referredTenantId },
      select: {
        id: true,
        status: true,
        referrer_tenant_id: true,
        reward_months: true,
      },
    });

    if (!referralForUpdate) return;
    if (referralForUpdate.status === 'rewarded' || referralForUpdate.status === 'rejected') return;

    const inTxCompletedCount = await getCompletedSubscriptionPaymentsCount(tx, input.referredTenantId);
    if (inTxCompletedCount !== 1) return;

    const referrerTenant = await tx.tenants.findUnique({
      where: { id: referralForUpdate.referrer_tenant_id },
      select: {
        id: true,
        plan_id: true,
        expire_date: true,
        status: true,
      },
    });

    if (!referrerTenant) return;

    const rewardBaseDate =
      referrerTenant.expire_date && referrerTenant.expire_date > now
        ? referrerTenant.expire_date
        : now;
    const newExpireDate = addMonths(rewardBaseDate, rewardMonths);

    await tx.tenants.update({
      where: { id: referrerTenant.id },
      data: {
        expire_date: newExpireDate,
        status: referrerTenant.status ?? 'active',
      },
    });

    if (referrerTenant.plan_id) {
      await tx.subscription_changes.create({
        data: {
          tenant_id: referrerTenant.id,
          from_plan_id: referrerTenant.plan_id,
          to_plan_id: referrerTenant.plan_id,
          change_type: 'renewal',
          effective_date: now,
          prorated_amount: 0,
          status: 'completed',
          metadata: {
            source: 'referral_reward',
            reward_months: rewardMonths,
            referred_tenant_id: input.referredTenantId,
            payment_log_id: input.paymentLogId ?? null,
          },
        },
      });
    }

    await tx.tenant_referrals.update({
      where: { id: referralForUpdate.id },
      data: {
        status: 'rewarded',
        qualified_at: now,
        rewarded_at: now,
        metadata: {
          source: 'first_paid_month',
          reward_months: rewardMonths,
          payment_log_id: input.paymentLogId ?? null,
        },
      },
    });
  });

  const refreshed = await prisma.tenant_referrals.findUnique({
    where: { referred_tenant_id: input.referredTenantId },
    select: { status: true },
  });

  return {
    rewarded: refreshed?.status === 'rewarded',
    reason: refreshed?.status === 'rewarded' ? undefined : 'Reward not applied',
  };
}

export async function getReferralsSummaryForTenant(referrerTenantId: string) {
  const referrerTenant = await prisma.tenants.findUnique({
    where: { id: referrerTenantId },
    select: { subdomain: true },
  });

  const [rows, rewardedAgg] = await Promise.all([
    prisma.tenant_referrals.findMany({
      where: { referrer_tenant_id: referrerTenantId },
      include: {
        referred_tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    }),
    prisma.tenant_referrals.aggregate({
      where: {
        referrer_tenant_id: referrerTenantId,
        status: 'rewarded',
      },
      _sum: { reward_months: true },
    }),
  ]);

  const summary = {
    shareSubdomain: referrerTenant?.subdomain ?? '',
    totalReferrals: rows.length,
    pendingReferrals: rows.filter((row) => row.status === 'pending').length,
    qualifiedReferrals: rows.filter((row) => row.status === 'qualified').length,
    rewardedReferrals: rows.filter((row) => row.status === 'rewarded').length,
    rewardedMonths: rewardedAgg._sum.reward_months ?? 0,
  };

  return {
    summary,
    items: rows.map((row) => ({
      id: row.id,
      status: row.status,
      rewardMonths: row.reward_months,
      qualifiedAt: row.qualified_at?.toISOString() ?? null,
      rewardedAt: row.rewarded_at?.toISOString() ?? null,
      createdAt: row.created_at?.toISOString() ?? null,
      referredTenant: {
        id: row.referred_tenant.id,
        name: row.referred_tenant.name,
        subdomain: row.referred_tenant.subdomain,
        status: row.referred_tenant.status ?? 'active',
        createdAt: row.referred_tenant.created_at?.toISOString() ?? null,
      },
    })),
  };
}
