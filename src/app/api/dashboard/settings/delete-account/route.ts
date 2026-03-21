import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAnyRole, requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { executeTenantAccountDeletion } from '@/lib/tenant/account-deletion';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  confirmation: z.string().min(1, 'Confirmation text is required'),
  reason: z.string().max(1000).optional(),
});

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

    const result = await executeTenantAccountDeletion(request, {
      tenantId: tenant.id,
      userId: user.id,
      userEmail: user.email ?? null,
      reason: validatedData.reason?.trim() || null,
    });

    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    if (result.status === 'already_deleted') {
      return NextResponse.json(
        {
          success: true,
          message: 'This account is already scheduled for deletion.',
          redirectTo: result.redirectTo,
          retentionDays: result.retentionDays,
        },
        { status: 200 },
      );
    }

    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('Failed to sign out after account deletion:', signOutError);
    }

    return NextResponse.json({
      success: true,
      message: 'Your store has been deactivated and scheduled for deletion.',
      retentionDays: result.retentionDays,
      redirectTo: result.redirectTo,
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
