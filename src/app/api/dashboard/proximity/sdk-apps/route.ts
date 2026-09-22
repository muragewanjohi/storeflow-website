import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { newSdkKey } from '@/lib/proximity/validation';
import { z } from 'zod';

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    const apps = await prisma.proximity_sdk_apps.findMany({
      where: { tenant_id: tenant.id },
      select: {
        id: true,
        name: true,
        flavor: true,
        key_prefix: true,
        status: true,
        last_used_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ data: apps });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = z
      .object({
        name: z.string().min(1).max(255),
        flavor: z.enum(['scan', 'commission']),
      })
      .parse(await request.json());
    const key = newSdkKey(body.flavor);
    const app = await prisma.proximity_sdk_apps.create({
      data: {
        tenant_id: tenant.id,
        name: body.name,
        flavor: body.flavor,
        key_prefix: key.prefix,
        key_hash: key.hash,
      },
    });
    return NextResponse.json(
      {
        data: app,
        sdk_key: key.token,
        warning:
          body.flavor === 'commission'
            ? 'Commission keys must only ship in the merchant/staff app. Never put this key in the customer APK.'
            : 'Scan keys may be used in the supermarket consumer app only.',
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
