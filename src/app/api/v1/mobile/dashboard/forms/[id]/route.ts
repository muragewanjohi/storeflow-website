import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  FormAdminError,
  deleteForm,
  getForm,
  updateForm,
} from '@/lib/forms/admin-forms';
import { updateFormBuilderSchema } from '@/lib/forms/validation';

function parseFormUpdateBody(body: unknown) {
  const raw = (body ?? {}) as Record<string, unknown>;
  return updateFormBuilderSchema.parse({
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    email: raw.email,
    button_text: raw.button_text ?? raw.buttonText,
    fields: raw.fields,
    success_message: raw.success_message ?? raw.successMessage,
    status: raw.status,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;

  try {
    const form = await getForm(gate.ctx.tenantId, id);
    return NextResponse.json(mobileSuccess({ form }), { status: 200 });
  } catch (error) {
    if (error instanceof FormAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile form GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch form'), { status: 500 });
  }
}

async function handleUpdate(
  request: NextRequest,
  params: Promise<{ id: string }>,
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;

  try {
    const form = await updateForm(
      gate.ctx.tenantId,
      id,
      parseFormUpdateBody(await request.json()),
    );

    return NextResponse.json(mobileSuccess({ form }), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof FormAdminError) {
      const code = error.status === 404 ? 'NOT_FOUND' : error.status === 409 ? 'CONFLICT' : 'BAD_REQUEST';
      return NextResponse.json(mobileError(code, error.message), { status: error.status });
    }
    console.error('[Mobile form PUT/PATCH]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update form'), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, context.params);
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
    await deleteForm(gate.ctx.tenantId, id);
    return NextResponse.json(mobileSuccess({ deleted: true }), { status: 200 });
  } catch (error) {
    if (error instanceof FormAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile form DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete form'), { status: 500 });
  }
}
