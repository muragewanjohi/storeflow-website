/**
 * Onboarding AI Chat — OC.2 (docs/ONBOARDING_AI_CHAT_PLAN.md)
 *
 * ADDITIVE, not a replacement — see the corrected-scope note in
 * src/app/api/onboarding/chat/route.ts and IMPLEMENTATION_TRACKER.md's
 * OC.2 entry for why. Never a gate: nothing about registration or login
 * requires a merchant to finish this conversation.
 *
 * A merchant reaches this page two ways: manually, or via OC.4's post-login
 * redirect — tenant-login-form.tsx sends a merchant here instead of straight
 * to /dashboard when tenants.data.niche is still unset. That wiring is on
 * the SAME-ORIGIN, already-authenticated post-login redirect deliberately —
 * not on POST /api/tenants/register's `loginUrl`/register/page.tsx's
 * cross-origin window.location.assign(), which is a plain (unauthenticated)
 * link to this subdomain's own login page and stays untouched.
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
