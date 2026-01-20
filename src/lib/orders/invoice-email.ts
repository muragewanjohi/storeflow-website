/**
 * Invoice Email Notifications
 * 
 * Email templates for sending invoices to customers
 */

import { sendCustomerEmail } from '@/lib/email/service';
import type { Tenant } from '@/lib/tenant-context';
import { getTenantStoreUrl } from '@/lib/subscriptions/tenant-url';
import { getTenantContactEmail } from './emails';
import { getStaticOptions } from '@/lib/settings/static-options';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

interface OrderWithItems {
  id: string;
  order_number: string;
  invoice_number: string | null;
  total_amount: Decimal;
  status: string | null;
  payment_status: string | null;
  payment_gateway: string | null;
  transaction_id: string | null;
  created_at: Date | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  delivery_fee: Decimal | null;
  delivery_fee_status: string | null;
  delivery_fee_quote: Decimal | null;
  delivery_fee_notes: string | null;
  order_products: Array<{
    id: string;
    product_id: string | null;
    variant_id: string | null;
    quantity: number;
    price: Decimal;
    total: Decimal;
    products?: {
      name: string;
      image: string | null;
      sku: string | null;
    } | null;
  }>;
  payment_meta?: any;
}

/**
 * Send invoice email to customer (for M-Pesa and manual payment methods)
 */
export async function sendInvoiceEmail({
  order,
  tenant,
  customerEmail,
  customerName,
}: {
  order: OrderWithItems;
  tenant: Tenant;
  customerEmail: string;
  customerName: string;
}) {
  // Fetch currency settings for the tenant
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

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    const formatted = amount.toFixed(currency.decimalPlaces);
    const [integer, decimal] = formatted.split('.');
    const integerWithSeparator = integer.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandSeparator);
    const formattedAmount = `${integerWithSeparator}${currency.decimalSeparator}${decimal}`;
    
    if (currency.symbolPosition === 'left') {
      return `${currency.symbol}${formattedAmount}`;
    } else {
      return `${formattedAmount}${currency.symbol}`;
    }
  };
  
  const orderItems = order.order_products.map((item: any) => ({
    name: item.products?.name || 'Unknown Product',
    quantity: item.quantity,
    price: Number(item.price),
    total: Number(item.total),
  }));

  const totalAmount = Number(order.total_amount);
  const deliveryFee = Number(order.delivery_fee) || 0;
  const discount = (order as any).coupon_discounted ? Number((order as any).coupon_discounted) : 0;
  const subtotal = totalAmount - deliveryFee - discount;
  
  const storeUrl = getTenantStoreUrl(tenant);
  const orderUrl = `${storeUrl}/orders/${order.id}`;
  const invoiceUrl = `${storeUrl}/api/orders/${order.id}/invoice/download`;
  const contactEmail = getTenantContactEmail(tenant);
  
  // Format currency amounts
  const formattedTotal = formatCurrency(totalAmount);
  const formattedSubtotal = formatCurrency(subtotal);
  const formattedDeliveryFee = formatCurrency(deliveryFee);
  const formattedDiscount = formatCurrency(discount);

  // Get M-Pesa payment instructions from tenant settings
  let mpesaInstructions = '';
  if (order.payment_gateway === 'mpesa') {
    const mpesaSettings = await getStaticOptions(tenant.id, [
      'payment_mpesa_option',
      'payment_mpesa_send_money_number',
      'payment_mpesa_buy_goods_till',
      'payment_mpesa_paybill_number',
      'payment_mpesa_paybill_account',
      'payment_mpesa_pochi_phone',
    ]);

    const option = mpesaSettings.payment_mpesa_option;
    if (option === 'send_money' && mpesaSettings.payment_mpesa_send_money_number) {
      mpesaInstructions = `Send money to M-Pesa number: <strong>${mpesaSettings.payment_mpesa_send_money_number}</strong>`;
    } else if (option === 'buy_goods' && mpesaSettings.payment_mpesa_buy_goods_till) {
      mpesaInstructions = `Pay using Till Number: <strong>${mpesaSettings.payment_mpesa_buy_goods_till}</strong>`;
    } else if (option === 'paybill' && mpesaSettings.payment_mpesa_paybill_number) {
      mpesaInstructions = `Paybill Number: <strong>${mpesaSettings.payment_mpesa_paybill_number}</strong><br>Account Number: <strong>${mpesaSettings.payment_mpesa_paybill_account || 'N/A'}</strong>`;
    } else if (option === 'pochi' && mpesaSettings.payment_mpesa_pochi_phone) {
      mpesaInstructions = `Pochi la Biashara: <strong>${mpesaSettings.payment_mpesa_pochi_phone}</strong>`;
    }
  }

  const invoiceNumber = order.invoice_number || order.order_number;
  const invoiceDate = order.created_at 
    ? new Date(order.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${invoiceNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">INVOICE</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <h2 style="margin: 0 0 10px 0; color: #1f2937;">${tenant.name || 'Store'}</h2>
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${storeUrl}</p>
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Email: ${contactEmail}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Invoice #:</strong> ${invoiceNumber}</p>
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong> ${invoiceDate}</p>
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Order #:</strong> ${order.order_number}</p>
            </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Bill To:</h3>
            <p style="margin: 5px 0; color: #374151;"><strong>${customerName}</strong></p>
            ${order.email ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${order.email}</p>` : ''}
            ${order.phone ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${order.phone}</p>` : ''}
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="text-align: left; padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Item</th>
                  <th style="text-align: center; padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Qty</th>
                  <th style="text-align: right; padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Price</th>
                  <th style="text-align: right; padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItems.map((item) => `
                  <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 15px 0; color: #374151;">${item.name}</td>
                    <td style="text-align: center; padding: 15px 0; color: #6b7280;">${item.quantity}</td>
                    <td style="text-align: right; padding: 15px 0; color: #6b7280;">${formatCurrency(item.price)}</td>
                    <td style="text-align: right; padding: 15px 0; color: #374151; font-weight: 600;">${formatCurrency(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <table style="width: 100%;">
              <tr>
                <td style="text-align: right; padding: 5px 0; color: #6b7280;">Subtotal:</td>
                <td style="text-align: right; padding: 5px 0; padding-left: 20px; color: #374151; font-weight: 600;">${formattedSubtotal}</td>
              </tr>
              ${deliveryFee > 0 ? `
              <tr>
                <td style="text-align: right; padding: 5px 0; color: #6b7280;">Delivery Fee:</td>
                <td style="text-align: right; padding: 5px 0; padding-left: 20px; color: #374151; font-weight: 600;">${formattedDeliveryFee}</td>
              </tr>
              ` : ''}
              ${discount > 0 ? `
              <tr>
                <td style="text-align: right; padding: 5px 0; color: #6b7280;">Discount:</td>
                <td style="text-align: right; padding: 5px 0; padding-left: 20px; color: #10b981; font-weight: 600;">-${formattedDiscount}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 2px solid #e5e7eb; margin-top: 10px;">
                <td style="text-align: right; padding: 15px 0 5px 0; color: #1f2937; font-size: 18px; font-weight: 700;">Total:</td>
                <td style="text-align: right; padding: 15px 0 5px 0; padding-left: 20px; color: #1f2937; font-size: 18px; font-weight: 700;">${formattedTotal}</td>
              </tr>
            </table>
          </div>

          ${order.payment_gateway === 'mpesa' && mpesaInstructions ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">📱 Payment Instructions</h3>
            <p style="margin: 0 0 10px 0; color: #78350f; font-size: 14px;">
              ${mpesaInstructions}
            </p>
            <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">
              <strong>Important:</strong> After making payment, please provide your Transaction ID / Receipt Number in the order details page. Your payment will be verified before your order is processed.
            </p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceUrl}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">
              Download Invoice PDF
            </a>
            <a href="${orderUrl}" style="background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Order Details
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
            Thank you for your business!<br>
            If you have any questions, please contact us at <a href="mailto:${contactEmail}" style="color: #3b82f6;">${contactEmail}</a>
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
INVOICE

Invoice #: ${invoiceNumber}
Date: ${invoiceDate}
Order #: ${order.order_number}

Bill To:
${customerName}
${order.email || ''}
${order.phone || ''}

Items:
${orderItems.map((item) => `  ${item.name} - Qty: ${item.quantity} - ${formatCurrency(item.price)} each - Total: ${formatCurrency(item.total)}`).join('\n')}

Subtotal: ${formattedSubtotal}
${deliveryFee > 0 ? `Delivery Fee: ${formattedDeliveryFee}\n` : ''}${discount > 0 ? `Discount: -${formattedDiscount}\n` : ''}Total: ${formattedTotal}

${order.payment_gateway === 'mpesa' && mpesaInstructions ? `\nPayment Instructions:\n${mpesaInstructions.replace(/<[^>]*>/g, '')}\n\nAfter making payment, please provide your Transaction ID / Receipt Number in the order details page.` : ''}

Download Invoice: ${invoiceUrl}
View Order: ${orderUrl}

Thank you for your business!
  `;

  return sendCustomerEmail({
    to: customerEmail,
    subject: `Invoice ${invoiceNumber} - ${tenant.name || 'Store'}`,
    html,
    text,
    tenant,
  });
}
