import PDFDocument from 'pdfkit';

export type ProximityInvoiceLine = {
  locationName: string;
  zoneName: string;
  total: number;
};

export type ProximityInvoiceDocument = {
  invoiceId: string;
  status: string;
  issuedAt: Date;
  storeName: string;
  vendorName: string;
  vendorEmail: string | null;
  campaignName: string;
  startsAt: Date | null;
  endsAt: Date | null;
  amount: number;
  lines: ProximityInvoiceLine[];
  notes: string | null;
};

export function proximityInvoiceNumber(invoiceId: string): string {
  return `PX-${invoiceId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function kes(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function nairobiDate(value: Date | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export function renderProximityInvoicePdf(input: ProximityInvoiceDocument): Promise<Buffer> {
  const number = proximityInvoiceNumber(input.invoiceId);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(22).text('INVOICE');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(11).fillColor('#444444').text(input.storeName);
    doc.fillColor('#111111');
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(12).text(number);
    doc.font('Helvetica').fontSize(11).text(`Status: ${input.status}`);
    doc.text(`Issued: ${nairobiDate(input.issuedAt)}`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Bill to');
    doc.font('Helvetica').text(input.vendorName);
    if (input.vendorEmail) doc.text(input.vendorEmail);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Campaign');
    doc.font('Helvetica').text(input.campaignName);
    if (input.startsAt || input.endsAt) {
      doc.text(`${nairobiDate(input.startsAt)} – ${nairobiDate(input.endsAt)}`);
    }
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Shelf sections');
    doc.font('Helvetica');
    const lines = input.lines.length
      ? input.lines
      : [{ locationName: input.storeName, zoneName: input.campaignName, total: input.amount }];
    for (const line of lines) {
      doc.text(`${line.locationName} / ${line.zoneName}    ${kes(line.total)}`);
    }
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).text(`Total ${kes(input.amount)}`);
    doc.font('Helvetica').fontSize(10).fillColor('#444444');
    doc.moveDown(0.5);
    doc.text(input.notes || 'Pay the supermarket offline. Settlement is not automatic.');
    if (input.status === 'void') {
      doc.moveDown();
      doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(16).text('VOID');
    }
    doc.end();
  });
}
