import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { isLocalVendorOverview } from '@/lib/dev/local-test-login';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';

function periodStart(range: string, now: Date): Date {
  if (range === 'last_7_days') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === 'last_30_days') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
    }).format(now) + '-01T00:00:00+03:00'
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const advertiser = await requireAdvertiser(request);
    const { id } = await context.params;
    const range = request.nextUrl.searchParams.get('range') || 'this_month';
    const locationId = request.nextUrl.searchParams.get('location_id') || '';
    const overview = isLocalVendorOverview(request.headers.get('host') || '', advertiser.email);
    const currentStart = periodStart(range, new Date());
    const campaign = await prisma.proximity_campaigns.findFirst({
      where: {
        id,
        tenant_id: advertiser.tenant_id,
        ...(overview ? {} : { advertiser_id: advertiser.id }),
      },
      include: {
        advertiser: { select: { id: true, name: true } },
        placements: {
          include: {
            location: { select: { id: true, name: true } },
            zone: { select: { name: true } },
          },
        },
        invoices: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { id: true, status: true, amount: true, created_at: true },
        },
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [events, claims] = await Promise.all([
      prisma.proximity_events.findMany({
        where: {
          tenant_id: advertiser.tenant_id,
          campaign_id: id,
          ...(locationId ? { location_id: locationId } : {}),
          created_at: { gte: currentStart },
        },
        select: { event_type: true, impression_on_screen: true },
      }),
      prisma.proximity_claims.findMany({
        where: {
          tenant_id: advertiser.tenant_id,
          campaign_id: id,
          OR: [{ claimed_at: { gte: currentStart } }, { redeemed_at: { gte: currentStart } }],
        },
        select: { claimed_at: true, redeemed_at: true },
      }),
    ]);
    const delivered = events.filter((event) => event.event_type === 'delivered' && event.impression_on_screen).length;
    const clicked = events.filter((event) => event.event_type === 'clicked').length;
    const claimed = events.filter((event) => event.event_type === 'claimed').length;
    const currentClaims = claims.filter((claim) => claim.claimed_at && claim.claimed_at >= currentStart);
    const invoice = campaign.invoices[0];

    return NextResponse.json({
      data: campaign,
      stats: {
        delivered,
        clicked,
        claimed,
        redeemed: currentClaims.filter((claim) => claim.redeemed_at && claim.redeemed_at >= currentStart).length,
        click_rate: delivered ? clicked / delivered : 0,
      },
      invoice: invoice
        ? {
            ...invoice,
            invoice_number: `PX-${invoice.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          }
        : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
