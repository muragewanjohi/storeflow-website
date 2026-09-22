import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { z } from 'zod';

const bodySchema = z.object({
  action: z.enum(['approve', 'reject', 'pause', 'end']),
  reason: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());
    const campaign = await prisma.proximity_campaigns.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const status =
      body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : body.action === 'pause' ? 'paused' : 'ended';
    const updated = await prisma.proximity_campaigns.update({
      where: { id },
      data: {
        status,
        rejection_reason: body.action === 'reject' ? body.reason || 'Rejected' : campaign.rejection_reason,
        updated_at: new Date(),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return jsonError(error);
  }
}
