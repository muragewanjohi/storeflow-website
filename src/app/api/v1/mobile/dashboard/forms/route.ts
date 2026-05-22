import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  FormAdminError,
  createForm,
  listForms,
} from '@/lib/forms/admin-forms';
import { createFormBuilderSchema } from '@/lib/forms/validation';

function getParam(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  return value === null ? undefined : value;
}

function parseFormCreateBody(body: unknown) {
  const raw = (body ?? {}) as Record<string, unknown>;
  return createFormBuilderSchema.parse({
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

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(getParam(searchParams, 'page') || '1', 10);
    const limit = parseInt(getParam(searchParams, 'limit') || '20', 10);

    const result = await listForms(tenantId, {
      page,
      limit,
      search: getParam(searchParams, 'search'),
      status: getParam(searchParams, 'status'),
    });

    return NextResponse.json(
      mobileSuccess(
        {
          forms: result.forms.map((form) => ({
            id: form.id,
            title: form.title,
            slug: form.slug,
            description: form.description,
            status: form.status,
            submissionCount: form._count.form_submissions,
            createdAt: form.created_at?.toISOString() ?? null,
            updatedAt: form.updated_at?.toISOString() ?? null,
          })),
        },
        result.pagination,
      ),
      { status: 200 },
    );
  } catch (e) {
    console.error('[Mobile forms GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch forms'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const form = await createForm(gate.ctx.tenantId, parseFormCreateBody(await request.json()));

    return NextResponse.json(mobileSuccess({ form }), { status: 201 });
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
      return NextResponse.json(
        mobileError(error.status === 409 ? 'CONFLICT' : 'BAD_REQUEST', error.message),
        { status: error.status },
      );
    }
    console.error('[Mobile forms POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create form'), { status: 500 });
  }
}
