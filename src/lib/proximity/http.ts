import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { secretsEqual } from './tokens';
import { hashToken } from './validation';

export async function requireProximityStaff() {
  const user = await requireAuth();
  const tenant = await requireTenant();
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  if (!['tenant_admin', 'tenant_staff', 'landlord'].includes(user.role)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return { user, tenant };
}

export async function requireScanSdk(request: NextRequest) {
  return requireSdk(request, 'scan');
}

export async function requireCommissionSdk(request: NextRequest) {
  return requireSdk(request, 'commission');
}

async function requireSdk(request: NextRequest, flavor: 'scan' | 'commission') {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw Object.assign(new Error('SDK key required'), { status: 401 });
  }
  const prefix = token.slice(0, 20);
  const app = await prisma.proximity_sdk_apps.findFirst({
    where: { key_prefix: prefix, status: 'active', flavor },
  });
  if (!app || !secretsEqual(token, app.key_hash)) {
    throw Object.assign(new Error('Invalid SDK key'), { status: 401 });
  }
  await prisma.proximity_sdk_apps.update({
    where: { id: app.id },
    data: { last_used_at: new Date() },
  });
  return { tenantId: app.tenant_id, app };
}

export async function requireAdvertiser(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw Object.assign(new Error('Advertiser token required'), { status: 401 });
  }
  const hash = hashToken(token);
  const advertiser = await prisma.proximity_advertisers.findFirst({
    where: { access_token_hash: hash, status: 'active' },
  });
  if (!advertiser) {
    throw Object.assign(new Error('Invalid advertiser token'), { status: 401 });
  }
  return advertiser;
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => {
        const field = issue.path.join(' ');
        return field ? `${field}: ${issue.message}` : issue.message;
      })
      .join('. ');
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json(
      { error: 'That name is already in use. Pick a different branch or zone name.' },
      { status: 409 }
    );
  }
  const message = error instanceof Error ? error.message : 'Request failed';
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 400;
  if (message === 'Authentication required') {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  return NextResponse.json({ error: message }, { status: Number.isFinite(status) && status >= 400 ? status : 400 });
}
