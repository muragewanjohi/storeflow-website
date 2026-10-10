import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { campaignInputSchema } from '@/lib/proximity/validation';
import { createCampaignRecord } from '@/lib/proximity/service';
import { prisma } from '@/lib/prisma/client';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export async function GET(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const range = request.nextUrl.searchParams.get('range') || 'this_month';
    const now = new Date();
    const currentStart =
      range === 'last_7_days'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : range === 'last_30_days'
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(
              new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Africa/Nairobi',
                year: 'numeric',
                month: '2-digit',
              }).format(now) + '-01T00:00:00+03:00'
            );
    const spanMs = now.getTime() - currentStart.getTime();
    const previousStart = new Date(currentStart.getTime() - spanMs);
    const campaigns = await prisma.proximity_campaigns.findMany({
      where: { tenant_id: advertiser.tenant_id, advertiser_id: advertiser.id },
      include: {
        placements: { include: { location: { select: { name: true } }, zone: { select: { name: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });
    const campaignIds = campaigns.map((campaign) => campaign.id);
    const [events, claims, invoices] = await Promise.all([
      prisma.proximity_events.findMany({
        where: {
          tenant_id: advertiser.tenant_id,
          campaign_id: { in: campaignIds },
          created_at: { gte: previousStart },
        },
        select: {
          campaign_id: true,
          location_id: true,
          event_type: true,
          impression_on_screen: true,
          created_at: true,
          location: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.proximity_claims.findMany({
        where: {
          tenant_id: advertiser.tenant_id,
          campaign_id: { in: campaignIds },
          OR: [{ claimed_at: { gte: previousStart } }, { redeemed_at: { gte: previousStart } }],
        },
        select: {
          campaign_id: true,
          claimed_at: true,
          redeemed_at: true,
          campaign: { select: { name: true } },
        },
        orderBy: { claimed_at: 'desc' },
      }),
      prisma.proximity_invoices.findMany({
        where: {
          tenant_id: advertiser.tenant_id,
          advertiser_id: advertiser.id,
          created_at: { gte: previousStart },
        },
        select: {
          id: true,
          status: true,
          amount: true,
          created_at: true,
          campaign: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const countEvents = (start: Date, end: Date) => {
      const scoped = events.filter((event) => event.created_at && event.created_at >= start && event.created_at < end);
      return {
        delivered: scoped.filter((event) => event.event_type === 'delivered' && event.impression_on_screen).length,
        clicked: scoped.filter((event) => event.event_type === 'clicked').length,
        claimed: scoped.filter((event) => event.event_type === 'claimed').length,
      };
    };
    const current = countEvents(currentStart, new Date(now.getTime() + 1));
    const previous = countEvents(previousStart, currentStart);
    const currentClaims = claims.filter((claim) => claim.claimed_at && claim.claimed_at >= currentStart);
    const redeemed = currentClaims.filter((claim) => claim.redeemed_at && claim.redeemed_at >= currentStart).length;

    const performance = campaigns.map((campaign) => {
      const scoped = events.filter((event) => event.campaign_id === campaign.id && event.created_at && event.created_at >= currentStart);
      const delivered = scoped.filter((event) => event.event_type === 'delivered' && event.impression_on_screen).length;
      const clicked = scoped.filter((event) => event.event_type === 'clicked').length;
      const claimed = scoped.filter((event) => event.event_type === 'claimed').length;
      const campaignClaims = currentClaims.filter((claim) => claim.campaign_id === campaign.id);
      return {
        id: campaign.id,
        delivered,
        clicked,
        claimed,
        redeemed: campaignClaims.filter((claim) => claim.redeemed_at && claim.redeemed_at >= currentStart).length,
        click_rate: delivered ? clicked / delivered : 0,
      };
    });

    const branchMap = new Map<string, { name: string; delivered: number; clicked: number; claimed: number }>();
    for (const event of events) {
      if (!event.created_at || event.created_at < currentStart || !event.location_id) continue;
      const bucket = branchMap.get(event.location_id) || {
        name: event.location?.name || 'Unknown branch',
        delivered: 0,
        clicked: 0,
        claimed: 0,
      };
      if (event.event_type === 'delivered' && event.impression_on_screen) bucket.delivered += 1;
      if (event.event_type === 'clicked') bucket.clicked += 1;
      if (event.event_type === 'claimed') bucket.claimed += 1;
      branchMap.set(event.location_id, bucket);
    }

    const campaignActivity = campaigns
      .filter((campaign) => campaign.updated_at && campaign.updated_at >= currentStart)
      .map((campaign) => ({
        type: 'campaign',
        label: `${campaign.name} is ${campaign.status}`,
        detail: 'Campaign status',
        at: campaign.updated_at?.toISOString(),
      }));
    const eventActivity = events
      .filter((event) => event.created_at && event.created_at >= currentStart && ['clicked', 'claimed'].includes(event.event_type))
      .map((event) => ({
        type: event.event_type,
        label: event.event_type === 'clicked' ? 'Shopper opened an offer' : 'Shopper claimed an offer',
        detail: event.location?.name || 'In-store campaign',
        at: event.created_at?.toISOString(),
      }));
    const claimActivity = currentClaims
      .filter((claim) => claim.redeemed_at)
      .map((claim) => ({
        type: 'redeemed',
        label: 'Offer redeemed',
        detail: claim.campaign.name,
        at: claim.redeemed_at?.toISOString(),
      }));
    const invoiceActivity = invoices
      .filter((invoice) => invoice.created_at && invoice.created_at >= currentStart)
      .map((invoice) => ({
        type: 'invoice',
        label: `Invoice ${invoice.status}`,
        detail: invoice.campaign?.name || 'Campaign invoice',
        at: invoice.created_at?.toISOString(),
      }));

    return NextResponse.json({
      data: campaigns,
      stats: {
        ...current,
        redeemed,
        click_rate: current.delivered ? current.clicked / current.delivered : 0,
        previous: {
          ...previous,
          click_rate: previous.delivered ? previous.clicked / previous.delivered : 0,
        },
        note: 'On-screen cards only. Till purchases without a claim are not measured. This is not ROAS.',
      },
      dashboard: {
        range,
        current_start: currentStart.toISOString(),
        performance,
        branches: Array.from(branchMap.values()).sort((a, b) => b.delivered - a.delivered),
        activity: [...campaignActivity, ...eventActivity, ...claimActivity, ...invoiceActivity]
          .filter((item) => item.at)
          .sort((a, b) => String(b.at).localeCompare(String(a.at)))
          .slice(0, 8),
      },
      disclosure: SPOOFING_DISCLOSURE_EN,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const body = campaignInputSchema.parse(await request.json());
    if (!body.terms_accepted) {
      return NextResponse.json({ error: 'Accept the measurement disclosure before booking.' }, { status: 400 });
    }
    const campaign = await createCampaignRecord(
      advertiser.tenant_id,
      { ...body, advertiser_id: advertiser.id, fee_amount: null },
      'submitted',
      { ignoreClientFee: true }
    );
    return NextResponse.json({ data: campaign, next: 'Retailer must approve before the ad can go live.' }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
