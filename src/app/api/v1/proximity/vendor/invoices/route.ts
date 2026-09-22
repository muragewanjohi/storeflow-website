import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';

export async function GET(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const invoices = await prisma.proximity_invoices.findMany({
      where: { tenant_id: advertiser.tenant_id, advertiser_id: advertiser.id },
      select: {
        id: true,
        campaign_id: true,
        amount: true,
        status: true,
        notes: true,
        created_at: true,
        campaign: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({
      data: invoices,
      note: 'Phase 1 invoices are issued manually. Pay DukaNest offline (invoice / M-Pesa). This is not ROAS.',
    });
  } catch (error) {
    return jsonError(error);
  }
}
