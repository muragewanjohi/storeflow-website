import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireScanSdk } from '@/lib/proximity/http';
import { claimInputSchema } from '@/lib/proximity/validation';
import { claimOffer } from '@/lib/proximity/service';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireScanSdk(request);
    const body = claimInputSchema.parse(await request.json());
    const claim = await claimOffer({
      tenantId,
      campaignId: body.campaign_id,
      opaqueCustomerId: body.opaque_customer_id,
    });
    return NextResponse.json({
      data: {
        code: claim.code,
        expires_at: claim.expires_at,
        note: 'Show this code in the app. Till purchases without claiming are not measured.',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
