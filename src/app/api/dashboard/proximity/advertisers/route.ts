import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { advertiserInputSchema } from '@/lib/proximity/validation';
import { generateAccessToken } from '@/lib/proximity/tokens';
import { generateVendorPassword, hashVendorPassword } from '@/lib/proximity/vendor-auth';

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    const advertisers = await prisma.proximity_advertisers.findMany({
      where: { tenant_id: tenant.id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        status: true,
        password_hash: true,
        created_at: true,
        _count: { select: { campaigns: true } },
      },
    });
    return NextResponse.json({
      data: advertisers.map(({ password_hash, ...advertiser }) => ({
        ...advertiser,
        has_password: Boolean(password_hash),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = advertiserInputSchema.parse(await request.json());
    const email = body.email?.trim().toLowerCase() || null;
    if (!email) {
      return NextResponse.json({ error: 'Email is required so the vendor can sign in.' }, { status: 400 });
    }
    const duplicate = await prisma.proximity_advertisers.findFirst({
      where: { tenant_id: tenant.id, email: { equals: email, mode: 'insensitive' } },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'A vendor with this email already exists.' }, { status: 409 });
    }
    const access = generateAccessToken('dn_adv');
    const temporaryPassword = body.password || generateVendorPassword();
    const advertiser = await prisma.proximity_advertisers.create({
      data: {
        tenant_id: tenant.id,
        name: body.name,
        email,
        phone: body.phone || null,
        notes: body.notes || null,
        access_token_hash: access.hash,
        password_hash: await hashVendorPassword(temporaryPassword),
      },
      select: { id: true, name: true, email: true, phone: true, status: true, created_at: true },
    });
    return NextResponse.json(
      {
        data: { ...advertiser, has_password: true },
        temporary_password: body.password ? undefined : temporaryPassword,
        warning: 'Give the vendor this email and password. They sign in on the vendor page. The password is not shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
