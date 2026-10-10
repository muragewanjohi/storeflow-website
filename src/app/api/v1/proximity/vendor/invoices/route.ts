import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { isLocalVendorOverview } from '@/lib/dev/local-test-login';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { backfillCampaignInvoices } from '@/lib/proximity/service';
import { proximityInvoiceNumber } from '@/lib/proximity/invoice-pdf';

export async function GET(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const overview = isLocalVendorOverview(request.headers.get('host') || '', advertiser.email);
    await backfillCampaignInvoices(advertiser.tenant_id, overview ? undefined : advertiser.id);
    const invoices = await prisma.proximity_invoices.findMany({
      where: {
        tenant_id: advertiser.tenant_id,
        ...(overview ? { advertiser_id: { not: null } } : { advertiser_id: advertiser.id }),
      },
      select: {
        id: true,
        campaign_id: true,
        amount: true,
        status: true,
        notes: true,
        created_at: true,
        advertiser: { select: { name: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({
      data: invoices.map((invoice) => ({
        ...invoice,
        invoice_number: proximityInvoiceNumber(invoice.id),
      })),
      note: 'An invoice is issued when you submit a campaign. Download the PDF and pay the supermarket offline.',
    });
  } catch (error) {
    return jsonError(error);
  }
}
