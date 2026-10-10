import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { isLocalVendorOverview } from '@/lib/dev/local-test-login';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { proximityInvoiceNumber, renderProximityInvoicePdf } from '@/lib/proximity/invoice-pdf';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const advertiser = await requireAdvertiser(request);
    const { id } = await context.params;
    const invoice = await prisma.proximity_invoices.findFirst({
      where: { id, tenant_id: advertiser.tenant_id },
      include: {
        advertiser: { select: { id: true, name: true, email: true } },
        tenants: { select: { name: true } },
        campaign: {
          select: {
            name: true,
            starts_at: true,
            ends_at: true,
            quote_lines: {
              select: { location_name: true, zone_name: true, line_total: true },
            },
          },
        },
      },
    });
    const canDownload =
      invoice?.advertiser_id === advertiser.id ||
      isLocalVendorOverview(request.headers.get('host') || '', advertiser.email);
    if (!invoice || !canDownload) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const pdf = await renderProximityInvoicePdf({
      invoiceId: invoice.id,
      status: invoice.status,
      issuedAt: invoice.created_at || new Date(),
      storeName: invoice.tenants?.name || 'Supermarket',
      vendorName: invoice.advertiser?.name || advertiser.name,
      vendorEmail: invoice.advertiser?.email || advertiser.email,
      campaignName: invoice.campaign?.name || 'Campaign',
      startsAt: invoice.campaign?.starts_at || null,
      endsAt: invoice.campaign?.ends_at || null,
      amount: Number(invoice.amount),
      lines: (invoice.campaign?.quote_lines || []).map((line) => ({
        locationName: line.location_name,
        zoneName: line.zone_name,
        total: Number(line.line_total),
      })),
      notes: invoice.notes,
    });
    const filename = `${proximityInvoiceNumber(invoice.id)}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
