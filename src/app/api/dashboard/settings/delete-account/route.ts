import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAnyRole, requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { removeTenantDomain } from '@/lib/vercel-domains';
import { sendAccountDeletionConfirmationEmail } from '@/lib/subscriptions/emails';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  confirmation: z.string().min(1, 'Confirmation text is required'),
  reason: z.string().max(1000).optional(),
});

function buildMarketingRedirectUrl(
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);
    const tenant = await requireTenant();

    if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Access denied. You cannot delete this tenant account.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = deleteAccountSchema.parse(body);

    const expectedConfirmation = `DELETE ${tenant.subdomain}`;
    if (validatedData.confirmation.trim() !== expectedConfirmation) {
      return NextResponse.json(
        {
          error: 'Invalid confirmation text.',
          message: `Please type "${expectedConfirmation}" exactly to continue.`,
        },
        { status: 400 },
      );
    }

    const existingTenant = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      select: {
        id: true,
        data: true,
        status: true,
        subdomain: true,
        custom_domain: true,
      },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    if (existingTenant.status === 'deleted') {
      const retentionDays = parseInt(process.env.TENANT_RETENTION_DAYS || '90', 10);
      return NextResponse.json(
        {
          success: true,
          message: 'This account is already scheduled for deletion.',
          redirectTo: buildMarketingRedirectUrl(request, {
            subdomain: tenant.subdomain,
            tenantName: tenant.name || tenant.subdomain,
            retentionDays,
          }),
          retentionDays,
        },
        { status: 200 },
      );
    }

    const currentData =
      existingTenant.data &&
      typeof existingTenant.data === 'object' &&
      !Array.isArray(existingTenant.data)
        ? (existingTenant.data as Record<string, unknown>)
        : {};

    const deletedAt = new Date();

    await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        status: 'deleted',
        deleted_at: deletedAt,
        data: {
          ...currentData,
          account_deletion: {
            requested_at: deletedAt.toISOString(),
            requested_by_user_id: user.id,
            requested_by_email: user.email,
            reason: validatedData.reason?.trim() || null,
          },
        },
      },
    });

    const projectId = process.env.VERCEL_PROJECT_ID;
    if (projectId) {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      const subdomainUrl = `${tenant.subdomain}.${baseDomain}`;

      removeTenantDomain(subdomainUrl, projectId).catch((error) => {
        console.error(`Failed to remove subdomain ${subdomainUrl} from Vercel:`, error);
      });

      if (tenant.custom_domain) {
        removeTenantDomain(tenant.custom_domain, projectId).catch((error) => {
          console.error(`Failed to remove custom domain ${tenant.custom_domain} from Vercel:`, error);
        });
      }
    }

    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('Failed to sign out after account deletion:', signOutError);
    }

    const retentionDays = parseInt(process.env.TENANT_RETENTION_DAYS || '90', 10);
    const redirectTo = buildMarketingRedirectUrl(request, {
      subdomain: tenant.subdomain,
      tenantName: tenant.name || tenant.subdomain,
      deletedAt: deletedAt.toISOString(),
      retentionDays,
    });

    sendAccountDeletionConfirmationEmail({
      tenant: {
        ...tenant,
        contact_email: tenant.contact_email || user.email || null,
      } as typeof tenant,
      deletedAt,
      retentionDays,
    }).catch((emailError) => {
      console.error('Failed to send deletion confirmation email:', emailError);
    });

    return NextResponse.json({
      success: true,
      message: 'Your store has been deactivated and scheduled for deletion.',
      retentionDays,
      redirectTo,
    });
  } catch (error: unknown) {
    console.error('Error deleting tenant account:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data.',
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete account. Please try again.' },
      { status: 500 },
    );
  }
}

