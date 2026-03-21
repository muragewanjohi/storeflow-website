import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { removeTenantDomain } from '@/lib/vercel-domains';
import { sendAccountDeletionConfirmationEmail } from '@/lib/subscriptions/emails';
import { sendAccountDeletionConfirmationSms } from '@/lib/sms/tenant-notifications';
import type { Tenant } from '@/lib/tenant-context';

/**
 * Marketing-site URL for account restore (used after self-service deletion).
 */
export function buildMarketingRedirectUrl(
  request: NextRequest,
  params?: {
    subdomain?: string;
    tenantName?: string;
    deletedAt?: string;
    retentionDays?: number;
  },
): string {
  const host = request.headers.get('host') || '';
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || (process.env.NODE_ENV === 'development' ? 'http' : 'https');

  const [hostname, port] = host.split(':');
  const normalizedHost = (hostname || '').toLowerCase();
  const isLocal =
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost.endsWith('.localhost');

  const query = new URLSearchParams({
    accountDeleted: '1',
  });
  if (params?.subdomain) query.set('subdomain', params.subdomain);
  if (params?.tenantName) query.set('tenantName', params.tenantName);
  if (params?.deletedAt) query.set('deletedAt', params.deletedAt);
  if (typeof params?.retentionDays === 'number') query.set('retentionDays', String(params.retentionDays));

  if (isLocal) {
    return `${protocol}://localhost:${port || '3000'}/account/restore?${query.toString()}`;
  }

  const marketingDomain = process.env.MARKETING_DOMAIN?.split(':')[0] || 'www.dukanest.com';
  return `${protocol}://${marketingDomain}/account/restore?${query.toString()}`;
}

export type TenantAccountDeletionResult =
  | { status: 'not_found' }
  | { status: 'already_deleted'; retentionDays: number; redirectTo: string }
  | { status: 'deleted'; deletedAt: Date; retentionDays: number; redirectTo: string };

/**
 * Soft-delete tenant, remove Vercel domains, send confirmation email + SMS.
 * Call only after the user has typed the exact confirmation phrase (`DELETE {subdomain}`).
 */
export async function executeTenantAccountDeletion(
  request: NextRequest,
  input: Readonly<{
    tenantId: string;
    userId: string;
    userEmail: string | null;
    reason: string | null;
  }>,
): Promise<TenantAccountDeletionResult> {
  const existingTenant = await prisma.tenants.findUnique({
    where: { id: input.tenantId },
    select: {
      id: true,
      name: true,
      country: true,
      contact_email: true,
      data: true,
      status: true,
      subdomain: true,
      custom_domain: true,
    },
  });

  if (!existingTenant) {
    return { status: 'not_found' };
  }

  const retentionDays = parseInt(process.env.TENANT_RETENTION_DAYS || '90', 10);

  if (existingTenant.status === 'deleted') {
    return {
      status: 'already_deleted',
      retentionDays,
      redirectTo: buildMarketingRedirectUrl(request, {
        subdomain: existingTenant.subdomain,
        tenantName: existingTenant.name || existingTenant.subdomain,
        retentionDays,
      }),
    };
  }

  const currentData =
    existingTenant.data &&
    typeof existingTenant.data === 'object' &&
    !Array.isArray(existingTenant.data)
      ? (existingTenant.data as Record<string, unknown>)
      : {};

  const deletedAt = new Date();

  await prisma.tenants.update({
    where: { id: input.tenantId },
    data: {
      status: 'deleted',
      deleted_at: deletedAt,
      data: {
        ...currentData,
        account_deletion: {
          requested_at: deletedAt.toISOString(),
          requested_by_user_id: input.userId,
          requested_by_email: input.userEmail,
          reason: input.reason?.trim() || null,
        },
      },
    },
  });

  const projectId = process.env.VERCEL_PROJECT_ID;
  if (projectId) {
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const subdomainUrl = `${existingTenant.subdomain}.${baseDomain}`;

    removeTenantDomain(subdomainUrl, projectId).catch((error) => {
      console.error(`Failed to remove subdomain ${subdomainUrl} from Vercel:`, error);
    });

    if (existingTenant.custom_domain) {
      removeTenantDomain(existingTenant.custom_domain, projectId).catch((error) => {
        console.error(`Failed to remove custom domain ${existingTenant.custom_domain} from Vercel:`, error);
      });
    }
  }

  const redirectTo = buildMarketingRedirectUrl(request, {
    subdomain: existingTenant.subdomain,
    tenantName: existingTenant.name || existingTenant.subdomain,
    deletedAt: deletedAt.toISOString(),
    retentionDays,
  });

  const tenantForEmail: Tenant = {
    id: existingTenant.id,
    name: existingTenant.name,
    subdomain: existingTenant.subdomain,
    custom_domain: existingTenant.custom_domain ?? null,
    contact_email: existingTenant.contact_email || input.userEmail || null,
    status: 'deleted',
    created_at: deletedAt,
    updated_at: deletedAt,
  };

  sendAccountDeletionConfirmationEmail({
    tenant: tenantForEmail,
    deletedAt,
    retentionDays,
  }).catch((emailError) => {
    console.error('Failed to send deletion confirmation email:', emailError);
  });

  sendAccountDeletionConfirmationSms({
    tenantId: input.tenantId,
    countryIso2: existingTenant.country,
    storeName: existingTenant.name,
    retentionDays,
  }).catch((smsError) => {
    console.error('Failed to send deletion confirmation SMS:', smsError);
  });

  return {
    status: 'deleted',
    deletedAt,
    retentionDays,
    redirectTo,
  };
}
