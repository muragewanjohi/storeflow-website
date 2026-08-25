/**
 * Onboarding AI Chat — OC.2 (docs/ONBOARDING_AI_CHAT_PLAN.md)
 *
 * ADDITIVE, not a replacement — see the corrected-scope note in
 * src/app/api/onboarding/chat/route.ts and IMPLEMENTATION_TRACKER.md's
 * OC.2 entry for why. A merchant reaches this page voluntarily (there is no
 * automatic post-registration redirect wired up yet — deliberately deferred
 * pending verification of the cross-origin login handoff between
 * POST /api/tenants/register's `loginUrl` and the dashboard, which was out
 * of scope to touch blind).
 */

import { requireAuthOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import OnboardingChatClient from './onboarding-chat-client';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default async function OnboardingChatPage() {
  await requireAuthOrRedirect('/dashboard/login');
  const tenant = await requireTenant();

  const record = await prisma.tenants.findUnique({
    where: { id: tenant.id },
    select: { data: true },
  });
  const data = isRecord(record?.data) ? record.data : {};
  const knownBusinessType = typeof data.business_type === 'string' ? data.business_type : undefined;
  const knownNiche = typeof data.niche === 'string' ? data.niche : undefined;

  return (
    <OnboardingChatClient
      storeName={tenant.name}
      knownBusinessType={knownBusinessType}
      knownNiche={knownNiche}
    />
  );
}
