import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { advertiserInputSchema } from '@/lib/proximity/validation';
import { generateAccessToken } from '@/lib/proximity/tokens';

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
        created_at: true,
        _count: { select: { campaigns: true } },
      },
    });
    return NextResponse.json({ data: advertisers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = advertiserInputSchema.parse(await request.json());
    const access = generateAccessToken('dn_adv');
    const advertiser = await prisma.proximity_advertisers.create({
      data: {
        tenant_id: tenant.id,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        notes: body.notes || null,
        access_token_hash: access.hash,
      },
    });
    return NextResponse.json(
      {
        data: advertiser,
        access_token: access.token,
        warning: 'Store this token now. It is not shown again. Vendors never see customer PII.',
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
