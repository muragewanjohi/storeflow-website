import { type NextRequest, NextResponse } from 'next/server';
import { POST as tenantRegisterPost } from '@/app/api/tenants/register/route';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

type RegisterJson = {
  success?: boolean;
  message?: string;
  tenant?: unknown;
  loginUrl?: string;
  postRegistrationAuthUrl?: string | null;
  errors?: Array<{ field: string; message: string }>;
};

/**
 * POST /api/v1/mobile/auth/register
 * Same body and server logic as POST /api/tenants/register; response uses the mobile `{ success, data }` envelope.
 */
export async function POST(request: NextRequest) {
  try {
    const response = await tenantRegisterPost(request.clone() as NextRequest);
    const status = response.status;
    const body = (await response.json().catch(() => ({}))) as RegisterJson;

    if (status === 201 && body.success === true && body.tenant) {
      return NextResponse.json(
        mobileSuccess({
          message: body.message ?? 'Tenant registered successfully',
          tenant: body.tenant,
          loginUrl: body.loginUrl,
          postRegistrationAuthUrl: body.postRegistrationAuthUrl ?? null,
        }),
        { status: 201 },
      );
    }

    if (status === 409) {
      return NextResponse.json(
        mobileError(
          'CONFLICT',
          body.message ?? 'This subdomain or resource is already taken',
          body.errors,
        ),
        { status: 409 },
      );
    }

    if (status === 400) {
      const details =
        body.errors ??
        (body.message ? [{ field: 'body', message: body.message }] : undefined);
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', body.message ?? 'Validation failed', details),
        { status: 400 },
      );
    }

    return NextResponse.json(
      mobileError('INTERNAL_ERROR', body.message ?? 'Registration failed'),
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  } catch (e) {
    console.error('[Mobile auth register]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Registration failed'), { status: 500 });
  }
}
