/**
 * @jest-environment node
 */
import { proximityInvoiceNumber, renderProximityInvoicePdf } from '../invoice-pdf';

function pdfText(pdf: Buffer): string {
  return [...pdf.toString('latin1').matchAll(/<([0-9A-Fa-f]+)>/g)]
    .map((match) => Buffer.from(match[1], 'hex').toString('latin1'))
    .join('');
}

describe('proximity invoice pdf', () => {
  it('numbers an invoice from its id', () => {
    expect(proximityInvoiceNumber('9cb83b50-75ec-4529-ba29-0a87ec2d214f')).toBe('PX-9CB83B50');
  });

  it('renders a downloadable invoice for the campaign price', async () => {
    const pdf = await renderProximityInvoicePdf({
      invoiceId: '9cb83b50-75ec-4529-ba29-0a87ec2d214f',
      status: 'issued',
      issuedAt: new Date('2026-10-10T12:00:00+03:00'),
      storeName: 'Supermarket',
      vendorName: 'Demo vendor',
      vendorEmail: 'vendor@dukanest.test',
      campaignName: 'Weekend juice',
      startsAt: new Date('2026-10-05T00:00:00+03:00'),
      endsAt: new Date('2026-10-11T23:59:59+03:00'),
      amount: 11140,
      lines: [{ locationName: 'Ruaka Branch', zoneName: 'Yogurt', total: 11140 }],
      notes: 'Pay the supermarket offline.',
    });
    const text = pdfText(pdf);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(text).toContain('PX-9CB83B50');
    expect(text).toContain('Weekend juice');
    expect(text).toContain('11,140.00');
    expect(text).toContain('Ruaka Branch / Yogurt');
  });

  it('marks a rejected campaign invoice as void', async () => {
    const pdf = await renderProximityInvoicePdf({
      invoiceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      status: 'void',
      issuedAt: new Date('2026-10-10T12:00:00+03:00'),
      storeName: 'Supermarket',
      vendorName: 'Demo vendor',
      vendorEmail: null,
      campaignName: 'Rejected offer',
      startsAt: null,
      endsAt: null,
      amount: 5600,
      lines: [],
      notes: 'Voided because the supermarket rejected the campaign.',
    });
    expect(pdfText(pdf)).toContain('VOID');
  });
});
