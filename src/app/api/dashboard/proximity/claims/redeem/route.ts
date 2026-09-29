import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { redeemClaim } from '@/lib/proximity/service';

const bodySchema = z.object({
  code: z.string().min(4).max(40),
  note: z.string().max(255).optional().nullable(),
});

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    const claims = await prisma.proximity_claims.findMany({
      where: { tenant_id: tenant.id, redeemed_at: { not: null } },
      include: { campaign: { select: { name: true } } },
      orderBy: { redeemed_at: 'desc' },
      take: 20,
    });
    return NextResponse.json({
      data: claims.map((claim) => ({
        id: claim.id,
        code: claim.code,
        campaign_name: claim.campaign.name,
        redeemed_at: claim.redeemed_at,
        redeemed_note: claim.redeemed_note,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = bodySchema.parse(await request.json());
    const result = await redeemClaim(tenant.id, body.code, body.note);
    return NextResponse.json({
      data: {
        code: result.claim.code,
        campaign_name: result.claim.campaign.name,
        headline: result.claim.campaign.headline,
        redeemed_at: result.claim.redeemed_at,
        already_redeemed: result.alreadyRedeemed,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
