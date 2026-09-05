import { prisma } from '@/lib/prisma/client';
import { sendPlatformEmail } from '@/lib/email/service';
import { getTenantStoreUrl } from '@/lib/subscriptions/tenant-url';
import {
  extractHomepageInstallSnapshot,
  type HomepageInstallSnapshot,
} from '@/lib/onboarding/homepage-section-utils';
import { buildRewardChecklistProgress } from '@/lib/onboarding/reward-checklist-progress';
import { buildRewardChecklistDisplayItems } from '@/lib/onboarding/reward-checklist-items';

export const DEFAULT_ONBOARDING_REWARD_WINDOW_DAYS = 30;
export const DEFAULT_ONBOARDING_REWARD_BONUS_DAYS = 30;

/** @deprecated Use DEFAULT_ONBOARDING_REWARD_WINDOW_DAYS */
export const ONBOARDING_REWARD_WINDOW_DAYS = DEFAULT_ONBOARDING_REWARD_WINDOW_DAYS;
/** @deprecated Use DEFAULT_ONBOARDING_REWARD_BONUS_DAYS */
export const ONBOARDING_REWARD_BONUS_DAYS = DEFAULT_ONBOARDING_REWARD_BONUS_DAYS;

export interface OnboardingRewardPlanConfig {
  enabled: boolean;
  windowDays: number;
  bonusDays: number;
}

export type OnboardingRewardPlanInput = {
  onboarding_reward_window_days?: number | null;
  onboarding_reward_bonus_days?: number | null;
} | null | undefined;

export function resolveOnboardingRewardConfig(
  plan?: OnboardingRewardPlanInput,
): OnboardingRewardPlanConfig {
  const windowDays = plan?.onboarding_reward_window_days ?? DEFAULT_ONBOARDING_REWARD_WINDOW_DAYS;
  const bonusDays = plan?.onboarding_reward_bonus_days ?? DEFAULT_ONBOARDING_REWARD_BONUS_DAYS;
  const enabled = windowDays > 0 && bonusDays > 0;

  return {
    enabled,
    windowDays: enabled ? windowDays : 0,
    bonusDays: enabled ? bonusDays : 0,
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface OnboardingRewardAudit {
  granted_at?: string;
  completed_at?: string;
  expire_date_before?: string | null;
  expire_date_after?: string | null;
  bonus_days?: number;
}

export interface OnboardingRewardStatus {
  enabled: boolean;
  windowDays: number;
  eligible: boolean;
  daysRemainingInWindow: number;
  eligibleUntil: string | null;
  granted: boolean;
  grantedAt: string | null;
  bonusDays: number;
}

export interface RewardChecklistResponse {
  items: ReturnType<typeof buildRewardChecklistDisplayItems>;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  allComplete: boolean;
  nextSteps: ReturnType<typeof buildRewardChecklistDisplayItems>;
  nextAction: ReturnType<typeof buildRewardChecklistDisplayItems>[number] | null;
  homePageEditHref: string;
  reward: OnboardingRewardStatus;
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readHomepageInstallSnapshot(tenantData: unknown): HomepageInstallSnapshot | null {
  if (!isRecord(tenantData)) return null;
  const snapshot = tenantData.homepage_install_snapshot;
  if (!isRecord(snapshot)) return null;
  return snapshot as unknown as HomepageInstallSnapshot;
}

export function readOnboardingRewardAudit(tenantData: unknown): OnboardingRewardAudit | null {
  if (!isRecord(tenantData)) return null;
  const reward = tenantData.onboarding_reward;
  if (!isRecord(reward)) return null;
  return reward as OnboardingRewardAudit;
}

export function getOnboardingRewardWindowStatus(
  startDate: Date | string | null | undefined,
  windowDays: number = DEFAULT_ONBOARDING_REWARD_WINDOW_DAYS,
): Pick<OnboardingRewardStatus, 'eligible' | 'daysRemainingInWindow' | 'eligibleUntil'> {
  if (!windowDays || windowDays <= 0) {
    return { eligible: false, daysRemainingInWindow: 0, eligibleUntil: null };
  }

  const start = parseDate(startDate);
  if (!start) {
    return { eligible: false, daysRemainingInWindow: 0, eligibleUntil: null };
  }

  const eligibleUntil = new Date(start);
  eligibleUntil.setDate(eligibleUntil.getDate() + windowDays);
  const daysRemaining = Math.ceil((eligibleUntil.getTime() - Date.now()) / MS_PER_DAY);

  return {
    eligible: daysRemaining > 0,
    daysRemainingInWindow: Math.max(0, daysRemaining),
    eligibleUntil: eligibleUntil.toISOString(),
  };
}

export async function persistHomepageInstallSnapshot(
  tenantId: string,
  pageBuilderData: unknown,
): Promise<void> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: tenantId, deleted_at: null },
    select: { data: true },
  });
  if (!tenant) return;

  const existingData = isRecord(tenant.data) ? tenant.data : {};
  if (existingData.homepage_install_snapshot) return;

  const snapshot = extractHomepageInstallSnapshot(pageBuilderData);
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      data: {
        ...existingData,
        homepage_install_snapshot: JSON.parse(JSON.stringify(snapshot)),
      },
    },
  });
}

async function sendOnboardingRewardEmail(input: {
  to: string;
  tenantName: string;
  tenant: { subdomain: string; custom_domain?: string | null };
  bonusDays: number;
  newExpireDate: Date;
}) {
  const dashboardUrl = getTenantStoreUrl(input.tenant as Parameters<typeof getTenantStoreUrl>[0], '/dashboard');
  const formattedExpire = input.newExpireDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You earned ${input.bonusDays} bonus days</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #0025cc; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Congratulations!</h1>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px; padding: 24px;">
          <p style="margin-top: 0;">
            You completed the reward checklist for <strong>${input.tenantName}</strong>.
            We added <strong>${input.bonusDays} bonus days</strong> to your subscription.
          </p>
          <p>Your updated renewal date is <strong>${formattedExpire}</strong>.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #0025cc; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600;">
              Open Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendPlatformEmail({
    to: input.to,
    subject: `You earned ${input.bonusDays} bonus days on ${input.tenantName}`,
    html,
  });
}

export async function maybeGrantOnboardingReward(input: {
  tenantId: string;
  tenantName: string;
  tenantSubdomain: string;
  tenantCustomDomain?: string | null;
  tenantContactEmail?: string | null;
  startDate: Date | string | null | undefined;
  expireDate: Date | string | null | undefined;
  tenantData: unknown;
  allComplete: boolean;
  rewardConfig: OnboardingRewardPlanConfig;
}): Promise<{ granted: boolean; grantedAt: string | null; newExpireDate?: Date }> {
  const existingReward = readOnboardingRewardAudit(input.tenantData);
  if (existingReward?.granted_at) {
    return { granted: true, grantedAt: existingReward.granted_at };
  }

  if (!input.rewardConfig.enabled) {
    return { granted: false, grantedAt: null };
  }

  const windowStatus = getOnboardingRewardWindowStatus(
    input.startDate,
    input.rewardConfig.windowDays,
  );
  if (!windowStatus.eligible || !input.allComplete) {
    return { granted: false, grantedAt: null };
  }

  const now = new Date();
  const currentExpire = parseDate(input.expireDate) ?? now;
  const baseDate = currentExpire.getTime() > now.getTime() ? currentExpire : now;
  const newExpireDate = new Date(baseDate);
  newExpireDate.setDate(newExpireDate.getDate() + input.rewardConfig.bonusDays);

  const existingData = isRecord(input.tenantData) ? input.tenantData : {};
  await prisma.tenants.update({
    where: { id: input.tenantId },
    data: {
      expire_date: newExpireDate,
      data: {
        ...existingData,
        onboarding_reward: {
          granted_at: now.toISOString(),
          completed_at: now.toISOString(),
          expire_date_before: input.expireDate ? parseDate(input.expireDate)?.toISOString() ?? null : null,
          expire_date_after: newExpireDate.toISOString(),
          bonus_days: input.rewardConfig.bonusDays,
        },
      },
    },
  });

  if (input.tenantContactEmail) {
    try {
      await sendOnboardingRewardEmail({
        to: input.tenantContactEmail,
        tenantName: input.tenantName,
        tenant: {
          subdomain: input.tenantSubdomain,
          custom_domain: input.tenantCustomDomain,
        },
        bonusDays: input.rewardConfig.bonusDays,
        newExpireDate,
      });
    } catch (error) {
      console.error('[Onboarding Reward] Failed to send reward email:', error);
    }
  }

  return { granted: true, grantedAt: now.toISOString(), newExpireDate };
}

export async function loadRewardChecklistForTenant(tenantId: string): Promise<RewardChecklistResponse | null> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: tenantId, deleted_at: null },
    select: {
      id: true,
      name: true,
      subdomain: true,
      custom_domain: true,
      contact_email: true,
      start_date: true,
      expire_date: true,
      data: true,
      price_plans: {
        select: {
          onboarding_reward_window_days: true,
          onboarding_reward_bonus_days: true,
        },
      },
    },
  });

  if (!tenant) return null;

  const rewardConfig = resolveOnboardingRewardConfig(tenant.price_plans);

  const [productCount, categoryCount, activeSales, homePage] = await Promise.all([
    prisma.products.count({
      where: { tenant_id: tenantId, status: 'active', created_by: { not: null } },
    }),
    prisma.categories.count({
      where: { tenant_id: tenantId },
    }),
    prisma.sales.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: {
        _count: {
          select: { product_sales: true },
        },
      },
    }),
    prisma.pages.findFirst({
      where: { tenant_id: tenantId, slug: 'home' },
      select: { id: true, content: true },
    }),
  ]);

  const activeSaleCount = activeSales.length;
  const maxProductsOnActiveSale = activeSales.reduce(
    (max, sale) => Math.max(max, sale._count.product_sales),
    0,
  );

  const homepageInstallSnapshot = readHomepageInstallSnapshot(tenant.data);
  const progress = buildRewardChecklistProgress({
    productCount,
    categoryCount,
    activeSaleCount,
    maxProductsOnActiveSale,
    homePageContent: homePage?.content,
    homepageInstallSnapshot,
    tenantId,
  });

  const homePageEditHref = homePage?.id
    ? `/dashboard/pages/${homePage.id}/edit`
    : '/dashboard/pages';

  const items = buildRewardChecklistDisplayItems(progress.items, { homePageEditHref });
  const nextSteps = items
    .filter((item) => !item.completed)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  const existingReward = readOnboardingRewardAudit(tenant.data);
  const windowStatus = getOnboardingRewardWindowStatus(
    tenant.start_date,
    rewardConfig.windowDays,
  );

  let granted = !!existingReward?.granted_at;
  let grantedAt = existingReward?.granted_at ?? null;
  const bonusDays = existingReward?.bonus_days ?? rewardConfig.bonusDays;

  if (!granted && progress.allComplete && windowStatus.eligible && rewardConfig.enabled) {
    const grantResult = await maybeGrantOnboardingReward({
      tenantId,
      tenantName: tenant.name,
      tenantSubdomain: tenant.subdomain,
      tenantCustomDomain: tenant.custom_domain,
      tenantContactEmail: tenant.contact_email,
      startDate: tenant.start_date,
      expireDate: tenant.expire_date,
      tenantData: tenant.data,
      allComplete: progress.allComplete,
      rewardConfig,
    });
    granted = grantResult.granted;
    grantedAt = grantResult.grantedAt;
  }

  return {
    items,
    completedCount: progress.completedCount,
    totalCount: progress.totalCount,
    progressPercent: progress.progressPercent,
    allComplete: progress.allComplete,
    nextSteps,
    nextAction: nextSteps[0] ?? null,
    homePageEditHref,
    reward: {
      enabled: rewardConfig.enabled,
      windowDays: rewardConfig.windowDays,
      ...windowStatus,
      granted,
      grantedAt,
      bonusDays: granted ? bonusDays : rewardConfig.bonusDays,
    },
  };
}
