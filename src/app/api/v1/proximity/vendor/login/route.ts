import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError } from '@/lib/proximity/http';
import { vendorLoginSchema } from '@/lib/proximity/validation';
import { requireTenant } from '@/lib/tenant-context/server';
import {
  createVendorSessionToken,
  vendorPasswordMatches,
  vendorSessionCookieOptions,
  VENDOR_SESSION_COOKIE,
} from '@/lib/proximity/vendor-auth';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = vendorLoginSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const advertiser = await prisma.proximity_advertisers.findFirst({
      where: { tenant_id: tenant.id, email: { equals: email, mode: 'insensitive' }, status: 'active' },
    });
    if (!advertiser?.password_hash || !(await vendorPasswordMatches(body.password, advertiser.password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const session = createVendorSessionToken();
    await prisma.proximity_advertisers.update({
      where: { id: advertiser.id },
      data: { session_token_hash: session.hash, session_expires_at: session.expiresAt, updated_at: new Date() },
    });
    const response = NextResponse.json({
      data: { id: advertiser.id, name: advertiser.name, email: advertiser.email },
    });
    response.cookies.set(VENDOR_SESSION_COOKIE, session.token, vendorSessionCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
