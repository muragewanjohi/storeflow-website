import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';

const invoiceUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  notes: z.string().max(4000).optional().nullable(),
  status: z.enum(['draft', 'issued', 'paid', 'void']).optional(),
});

function invoiceShares(amount: number, supermarketPct: number) {
  const supermarketShare = Math.round(amount * supermarketPct) / 100;
  const dukanestShare = Math.round((amount - supermarketShare) * 100) / 100;
  return { supermarketShare, dukanestShare };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = invoiceUpdateSchema.parse(await request.json());
    const existing = await prisma.proximity_invoices.findFirst({
      where: { id, tenant_id: tenant.id },
      include: { campaign: { select: { supermarket_share_pct: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (existing.status === 'paid' && (body.amount !== undefined || (body.status && body.status !== 'paid'))) {
      return NextResponse.json(
        { error: 'Paid invoices cannot be edited or voided from here.' },
        { status: 409 }
      );
    }

    const amount = body.amount ?? Number(existing.amount);
    const supermarketPct = Number(existing.campaign?.supermarket_share_pct ?? 70);
    const shares = invoiceShares(amount, supermarketPct);

    const invoice = await prisma.proximity_invoices.update({
      where: { id },
      data: {
        amount,
        supermarket_share: shares.supermarketShare,
        dukanest_share: shares.dukanestShare,
        notes: body.notes === undefined ? existing.notes : body.notes || null,
        status: body.status || existing.status,
        updated_at: new Date(),
      },
    });
    return NextResponse.json({ data: invoice });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const existing = await prisma.proximity_invoices.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (existing.status === 'paid') {
      return NextResponse.json(
        { error: 'Paid invoices cannot be deleted.' },
        { status: 409 }
      );
    }
    await prisma.proximity_invoices.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
