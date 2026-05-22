import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  MediaAdminError,
  deleteMediaForTenant,
  updateMediaForTenant,
} from '@/lib/media/admin-media';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;

  try {
    const media = await updateMediaForTenant(gate.ctx.tenantId, id, await request.json());
    return NextResponse.json(mobileSuccess({ media }), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid payload',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof MediaAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile media PUT]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update media'), { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;

  try {
    const result = await deleteMediaForTenant(gate.ctx.tenantId, id);
    return NextResponse.json(mobileSuccess(result), { status: 200 });
  } catch (error) {
    if (error instanceof MediaAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile media DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete media'), { status: 500 });
  }
}
