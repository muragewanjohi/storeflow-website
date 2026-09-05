import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { executeTenantAccountDeletion } from '@/lib/tenant/account-deletion';

const deleteAccountSchema = z.object({
  confirmation: z.string().min(1, 'Confirmation text is required'),
  reason: z.string().max(1000).optional(),
});

/**
 * POST /api/v1/mobile/dashboard/settings/delete-account
 * Bearer auth — same soft-delete behavior as POST /api/dashboard/settings/delete-account.
 * Client should clear stored tokens after success (session is not invalidated server-side here).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only the store owner can delete this account'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = deleteAccountSchema.parse(body);

    const tenantRow = await prisma.tenants.findUnique({
      where: { id: user.tenant_id },
      select: { id: true, subdomain: true },
    });

    if (!tenantRow) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    const expectedConfirmation = `DELETE ${tenantRow.subdomain}`;
    if (validatedData.confirmation.trim() !== expectedConfirmation) {
      return NextResponse.json(
        mobileError('BAD_REQUEST', 'Invalid confirmation text.', [
          { field: 'confirmation', message: `Type "${expectedConfirmation}" exactly.` },
        ]),
        { status: 400 },
      );
    }

    const result = await executeTenantAccountDeletion(request, {
      tenantId: tenantRow.id,
      userId: user.id,
      userEmail: user.email ?? null,
      reason: validatedData.reason?.trim() || null,
    });

    if (result.status === 'not_found') {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    if (result.status === 'already_deleted') {
      return NextResponse.json(
        mobileSuccess({
          message: 'This account is already scheduled for deletion.',
          retentionDays: result.retentionDays,
          redirectTo: result.redirectTo,
          clearLocalSession: true,
        }),
        { status: 200 },
      );
    }

    return NextResponse.json(
      mobileSuccess({
        message: 'Your store has been deactivated and scheduled for deletion.',
        deletedAt: result.deletedAt.toISOString(),
        retentionDays: result.retentionDays,
        redirectTo: result.redirectTo,
        clearLocalSession: true,
      }),
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[Mobile delete-account]', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid request body',
          error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized mobile request') {
      return NextResponse.json(mobileError('UNAUTHORIZED', 'Invalid or missing access token'), {
        status: 401,
      });
    }

    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete account'), {
      status: 500,
    });
  }
}
