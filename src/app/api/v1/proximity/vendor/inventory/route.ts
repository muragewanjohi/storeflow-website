import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const locations = await prisma.proximity_locations.findMany({
      where: { tenant_id: advertiser.tenant_id, status: 'active' },
      include: { zones: { where: { status: 'active' }, select: { id: true, name: true, kind: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: locations });
  } catch (error) {
    return jsonError(error);
  }
}
