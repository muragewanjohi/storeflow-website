/**
 * Invoice PDF Generation Utility
 * 
 * Generates PDF invoices using pdfkit
 */

import PDFDocument from 'pdfkit';
import type { Tenant } from '@/lib/tenant-context';
import type { Prisma } from '@prisma/client';
import { getStaticOptions } from '@/lib/settings/static-options';

type Decimal = Prisma.Decimal;

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  product_sku?: string | null;
  variant_sku?: string | null;
}

interface Order {
  id: string;
  order_number: string;
  invoice_number: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  total_amount: Decimal | number;
  status: string | null;
  payment_status: string | null;
  payment_gateway: string | null;
  transaction_id: string | null;
  shipping_address: any;
  billing_address: any;
  coupon: string | null;
  coupon_discounted: Decimal | number | null;
  delivery_fee: Decimal | number | null;
  created_at: Date | string | null;
  order_products?: OrderItem[];
}

interface InvoiceOptions {
  type: 'invoice' | 'receipt';
  includePaymentInstructions?: boolean;
}

/**
 * Generate PDF invoice or receipt
 */
export async function generateInvoicePDF(
  order: Order,
  tenant: Tenant,
  options: InvoiceOptions = { type: 'invoice' }
): Promise<Buffer> {
  // Get currency settings
  const currencyOptions = await getStaticOptions(tenant.id, [
    'currency_code',
    'currency_symbol',
    'currency_symbol_position',
    'currency_thousand_separator',
    'currency_decimal_separator',
    'currency_decimal_places',
  ]);

  const currency = {
    code: currencyOptions.currency_code || 'USD',
    symbol: currencyOptions.currency_symbol || '$',
    symbolPosition: currencyOptions.currency_symbol_position || 'left',
    thousandSeparator: currencyOptions.currency_thousand_separator || ',',
    decimalSeparator: currencyOptions.currency_decimal_separator || '.',
    decimalPlaces: parseInt(currencyOptions.currency_decimal_places || '2', 10),
  };

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(options.type === 'invoice' ? 'INVOICE' : 'RECEIPT', 50, 50, { align: 'left' });

      // Store Information
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(tenant.name || 'Store', 50, 90);

      // Get store details from static_options if available
      // For now, use tenant name
      const storeAddress = tenant.custom_domain 
        ? `https://${tenant.custom_domain}` 
        : `https://${tenant.subdomain}.dukanest.com`;
      
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(storeAddress, 50, 105)
        .text(`Email: ${tenant.contact_email || 'support@store.com'}`, 50, 118);

      // Invoice/Receipt Details
      const invoiceNumber = order.invoice_number || order.order_number;
      const invoiceDate = order.created_at 
        ? new Date(order.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : new Date().toLocaleDateString();

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${options.type === 'invoice' ? 'Invoice' : 'Receipt'} #: ${invoiceNumber}`, 400, 90, { align: 'right' })
        .font('Helvetica')
        .text(`Date: ${invoiceDate}`, 400, 105, { align: 'right' })
        .text(`Order #: ${order.order_number}`, 400, 118, { align: 'right' });

      // Customer Information
      const customerName = order.name || 'Customer';
      const customerEmail = order.email || '';
      const customerPhone = order.phone || '';
      const billingAddress = order.billing_address || order.shipping_address || {};

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, 160)
        .fontSize(10)
        .font('Helvetica')
        .text(customerName, 50, 178);

      if (customerEmail) {
        doc.text(`Email: ${customerEmail}`, 50, 193);
      }
      if (customerPhone) {
        doc.text(`Phone: ${customerPhone}`, 50, customerEmail ? 208 : 193);
      }

      let addressY = customerEmail && customerPhone ? 223 : customerEmail || customerPhone ? 208 : 193;
      
      if (billingAddress.address_line_1) {
        doc.text(billingAddress.address_line_1, 50, addressY);
        addressY += 13;
      }
      if (billingAddress.city || billingAddress.state) {
        const cityState = [billingAddress.city, billingAddress.state].filter(Boolean).join(', ');
        doc.text(cityState, 50, addressY);
        addressY += 13;
      }
      if (billingAddress.postal_code || billingAddress.country) {
        const postalCountry = [billingAddress.postal_code, billingAddress.country].filter(Boolean).join(' ');
        doc.text(postalCountry, 50, addressY);
      }

      // Items Table Header
      let tableY = 280;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Item', 50, tableY)
        .text('Quantity', 250, tableY)
        .text('Price', 350, tableY, { align: 'right' })
        .text('Total', 450, tableY, { align: 'right' });

      // Draw line under header
      doc
        .moveTo(50, tableY + 15)
        .lineTo(550, tableY + 15)
        .stroke();

      // Order Items
      tableY += 25;
      const items = order.order_products || [];
      
      items.forEach((item) => {
        const itemName = item.product_name || 'Product';
        const sku = item.variant_sku || item.product_sku || '';
        const displayName = sku ? `${itemName} (${sku})` : itemName;
        
        // Handle long product names
        const maxWidth = 180;
        const lines = doc.heightOfString(displayName, { width: maxWidth });
        
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(displayName, 50, tableY, { width: maxWidth })
          .text(item.quantity.toString(), 250, tableY)
          .text(formatCurrency(item.price, currency), 350, tableY, { align: 'right' })
          .text(formatCurrency(item.total, currency), 450, tableY, { align: 'right' });

        tableY += Math.max(15, lines * 12);
      });

      // Totals
      const subtotal = Number(order.total_amount) - (Number(order.delivery_fee) || 0) - (Number(order.coupon_discounted) || 0);
      const deliveryFee = Number(order.delivery_fee) || 0;
      const discount = Number(order.coupon_discounted) || 0;
      const total = Number(order.total_amount);

      tableY += 20;
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 350, tableY, { align: 'right' })
        .text(formatCurrency(subtotal, currency), 450, tableY, { align: 'right' });

      if (deliveryFee > 0) {
        tableY += 15;
        doc
          .text('Delivery Fee:', 350, tableY, { align: 'right' })
          .text(formatCurrency(deliveryFee, currency), 450, tableY, { align: 'right' });
      }

      if (discount > 0) {
        tableY += 15;
        doc
          .text(`Discount${order.coupon ? ` (${order.coupon})` : ''}:`, 350, tableY, { align: 'right' })
          .text(`-${formatCurrency(discount, currency)}`, 450, tableY, { align: 'right' });
      }

      tableY += 20;
      doc
        .moveTo(350, tableY - 5)
        .lineTo(550, tableY - 5)
        .stroke()
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', 350, tableY, { align: 'right' })
        .text(formatCurrency(total, currency), 450, tableY, { align: 'right' });

      // Payment Information
      tableY += 40;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Payment Information:', 50, tableY);

      tableY += 15;
      doc
        .font('Helvetica')
        .text(`Status: ${formatPaymentStatus(order.payment_status || 'pending')}`, 50, tableY);

      if (order.payment_gateway) {
        tableY += 13;
        doc.text(`Method: ${formatPaymentMethod(order.payment_gateway)}`, 50, tableY);
      }

      if (order.transaction_id) {
        tableY += 13;
        doc.text(`Transaction ID: ${order.transaction_id}`, 50, tableY);
      }

      // Payment Instructions (for invoices only)
      if (options.type === 'invoice' && options.includePaymentInstructions && order.payment_gateway === 'mpesa') {
        tableY += 30;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Payment Instructions:', 50, tableY);

        tableY += 15;
        doc
          .fontSize(9)
          .font('Helvetica')
          .text('Please make payment via M-Pesa using the details provided in your order confirmation email.', 50, tableY, { width: 500 })
          .text('After payment, your order will be verified and processed.', 50, tableY + 20, { width: 500 });
      }

      // Footer
      const footerY = 750;
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Thank you for your business!', 50, footerY, { align: 'center', width: 500 })
        .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 15, { align: 'center', width: 500 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format currency using tenant settings
 */
function formatCurrency(amount: number, currency: {
  symbol: string;
  symbolPosition: string;
  thousandSeparator: string;
  decimalSeparator: string;
  decimalPlaces: number;
}): string {
  const formatted = amount.toFixed(currency.decimalPlaces);
  const [integer, decimal] = formatted.split('.');
  const integerWithSeparator = integer.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandSeparator);
  const formattedAmount = `${integerWithSeparator}${currency.decimalSeparator}${decimal}`;
  
  if (currency.symbolPosition === 'left') {
    return `${currency.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${currency.symbol}`;
  }
}

/**
 * Format payment status
 */
function formatPaymentStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Format payment method
 */
function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    cash: 'Cash',
    mpesa: 'M-Pesa',
  };
  return methods[method] || method;
}
