import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import type { UserRole } from '@/lib/auth/types';
import { generateAndSendOTP } from '@/lib/mfa/email-otp';

export type MobileDashboardSignInOutcome = {
  status: number;
  payload: ReturnType<typeof mobileSuccess> | ReturnType<typeof mobileError>;
};

/**
 * After Supabase has issued a session (password or Google ID token), apply mobile dashboard rules:
 * role gate, tenant resolution, email OTP for tenant_admin / tenant_staff, or full tokens for landlord.
 */
export async function finalizeMobileDashboardSignIn(
  supabase: SupabaseClient,
  user: User,
  session: Session,
  emailFallback: string,
  options?: Readonly<{
    skipEmailOtpForTenantRoles?: boolean;
  }>,
): Promise<MobileDashboardSignInOutcome> {
  const role = ((user.user_metadata?.role as UserRole | undefined) ?? 'customer');
  const isDashboardRole = role === 'tenant_admin' || role === 'tenant_staff' || role === 'landlord';

  if (!isDashboardRole) {
    await supabase.auth.signOut();
    return {
      status: 403,
      payload: mobileError('FORBIDDEN', 'This account is not allowed to access the mobile dashboard API'),
    };
  }

  const isTenantRole = role === 'tenant_admin' || role === 'tenant_staff';
  let tenantId =
    typeof user.user_metadata?.tenant_id === 'string' ? user.user_metadata.tenant_id : undefined;

  if (!tenantId && isTenantRole) {
    const ownedTenant = await prisma.tenants.findFirst({
      where: {
        user_id: user.id,
        deleted_at: null,
      },
      select: { id: true, status: true },
    });

    if (ownedTenant?.status === 'deleted') {
      await supabase.auth.signOut();
      return {
        status: 403,
        payload: mobileError('FORBIDDEN', 'Tenant account is deleted'),
      };
    }

    tenantId = ownedTenant?.id;
  }

  if (isTenantRole && !tenantId) {
    await supabase.auth.signOut();
    return {
      status: 403,
      payload: mobileError('FORBIDDEN', 'Tenant account is not linked to this user'),
    };
  }

  if (isTenantRole) {
    const tenant = await prisma.tenants.findFirst({
      where: {
        OR: [...(tenantId ? [{ id: tenantId }] : []), { user_id: user.id }],
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
      },
    });

    if (!tenant || tenant.status === 'deleted') {
      await supabase.auth.signOut();
      return {
        status: 403,
        payload: mobileError('FORBIDDEN', 'Tenant account is deleted or unavailable'),
      };
    }

    const email = user.email ?? emailFallback;
    if (!email) {
      await supabase.auth.signOut();
      return {
        status: 403,
        payload: mobileError('FORBIDDEN', 'User email is required for verification'),
      };
    }

    const skipEmailOtp = options?.skipEmailOtpForTenantRoles === true;
    if (!skipEmailOtp) {
      const tenantNameForMfa = tenant.name || tenant.subdomain;
      await generateAndSendOTP(user.id, email, tenantNameForMfa);

      return {
        status: 200,
        payload: mobileSuccess({
          requiresMfa: true,
          mfaMethod: 'email_otp',
          message: `A 6-digit code has been sent to ${email}`,
          user: {
            id: user.id,
            email,
            role,
            tenantId: tenant.id,
          },
          tempSession: {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at,
          },
        }),
      };
    }

    return {
      status: 200,
      payload: mobileSuccess({
        requiresMfa: false,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email,
          role,
          tenantId: tenant.id,
        },
      }),
    };
  }

  return {
    status: 200,
    payload: mobileSuccess({
      requiresMfa: false,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role,
        tenantId,
      },
    }),
  };
}
