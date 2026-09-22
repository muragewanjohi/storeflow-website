import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { createManualInvoice } from '@/lib/proximity/service';
import { z } from 'zod';

const invoiceSchema = z.object({
  campaign_id: z.string().uuid(),
  amount: z.number().positive(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    const invoices = await prisma.proximity_invoices.findMany({
      where: { tenant_id: tenant.id },
      include: {
        advertiser: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ data: invoices });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = invoiceSchema.parse(await request.json());
    const invoice = await createManualInvoice({
      tenantId: tenant.id,
      campaignId: body.campaign_id,
      amount: body.amount,
      notes: body.notes,
    });
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
