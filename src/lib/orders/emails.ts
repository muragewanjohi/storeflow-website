/**
 * Order Email Notifications
 * 
 * Email templates and functions for order-related notifications
 */

import { sendEmail } from '@/lib/email/sendgrid';
import { prisma } from '@/lib/prisma/client';
import type { orders } from '@prisma/client';
import type { Tenant } from '@/lib/tenant-context';

/**
 * Get tenant-specific email address
 * Uses custom domain if available, otherwise uses subdomain
 * 
 * Note: For SendGrid to send emails from tenant-specific domains, those domains
 * must be verified in SendGrid. This includes:
 * - Adding the domain in SendGrid dashboard
 * - Verifying domain ownership via DNS records
 * - Setting up SPF, DKIM, and DMARC records
 * 
 * For subdomains (*.dukanest.com), you can verify the parent domain (dukanest.com)
 * and use subdomain authentication for individual subdomains.
 */
function getTenantEmailAddress(tenant: Tenant): string {
  if (tenant.custom_domain) {
    // Use custom domain if available (e.g., noreply@tenantstore.com)
    return `noreply@${tenant.custom_domain}`;
  }
  // Fallback to subdomain (e.g., noreply@tenantstore.dukanest.com)
  return `noreply@${tenant.subdomain}.dukanest.com`;
}

interface OrderWithItems extends orders {
  order_products: Array<{
    id: string;
    quantity: number;
    price: any;
    total: any;
    products: {
      id: string;
      name: string;
      image: string | null;
    } | null;
  }>;
}

/**
 * Send order placed confirmation email to customer
 */
export async function sendOrderPlacedEmail({
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
  const orderItems = order.order_products.map((item) => ({
    name: item.products?.name || 'Unknown Product',
    quantity: item.quantity,
    price: Number(item.price),
    total: Number(item.total),
  }));

  const totalAmount = Number(order.total_amount);
  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const orderUrl = `${storeUrl}/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Order Confirmed!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customerName},</p>
          
          <p>Thank you for your order! We've received your order and will begin processing it shortly.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Order Details</h2>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at || '').toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Payment Status:</strong> ${order.payment_status}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="text-align: left; padding: 10px 0;">Item</th>
                  <th style="text-align: center; padding: 10px 0;">Quantity</th>
                  <th style="text-align: right; padding: 10px 0;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${orderItems.map((item) => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 0;">${item.name}</td>
                    <td style="text-align: center; padding: 10px 0;">${item.quantity}</td>
                    <td style="text-align: right; padding: 10px 0;">$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="2" style="text-align: right; padding: 10px 0; font-weight: bold;">Total:</td>
                  <td style="text-align: right; padding: 10px 0; font-weight: bold;">$${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions about your order, please contact us at <a href="mailto:${getTenantEmailAddress(tenant)}">${getTenantEmailAddress(tenant)}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            ${tenant.name}
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Order Confirmation - ${order.order_number}

Hello ${customerName},

Thank you for your order! We've received your order and will begin processing it shortly.

Order Details:
- Order Number: ${order.order_number}
- Order Date: ${new Date(order.created_at || '').toLocaleDateString()}
- Total Amount: $${totalAmount.toFixed(2)}
- Status: ${order.status}
- Payment Status: ${order.payment_status}

Order Items:
${orderItems.map((item) => `- ${item.name} x${item.quantity} - $${item.total.toFixed(2)}`).join('\n')}

Total: $${totalAmount.toFixed(2)}

View your order: ${orderUrl}

If you have any questions about your order, please contact us at ${getTenantEmailAddress(tenant)}.

Best regards,
${tenant.name}
  `;

  return sendEmail({
    to: customerEmail,
    from: getTenantEmailAddress(tenant),
    fromName: tenant.name || 'Store',
    subject: `Order Confirmation - ${order.order_number}`,
    html,
    text,
  });
}

/**
 * Send new order alert email to tenant admin
 */
export async function sendNewOrderAlertEmail({
  order,
  tenant,
}: {
  order: OrderWithItems;
  tenant: Tenant;
}) {
  // Get tenant admin email (you might want to fetch from users table)
  // For now, we'll use a placeholder
  const adminEmail = `${tenant.subdomain}@dukanest.com`; // TODO: Fetch actual admin email

  const orderItems = order.order_products.map((item) => ({
    name: item.products?.name || 'Unknown Product',
    quantity: item.quantity,
    price: Number(item.price),
    total: Number(item.total),
  }));

  const totalAmount = Number(order.total_amount);
  const dashboardUrl = `https://${tenant.subdomain}.dukanest.com/dashboard/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Alert - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">New Order Received!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello,</p>
          
          <p>A new order has been placed in your store <strong>${tenant.name}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h2 style="margin-top: 0; color: #f59e0b;">Order Details</h2>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Customer:</strong> ${order.name || 'N/A'}</p>
            <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${order.phone || 'N/A'}</p>
            <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
            <p><strong>Payment Status:</strong> ${order.payment_status}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at || '').toLocaleDateString()}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #f59e0b;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="text-align: left; padding: 10px 0;">Item</th>
                  <th style="text-align: center; padding: 10px 0;">Quantity</th>
                  <th style="text-align: right; padding: 10px 0;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItems.map((item) => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 0;">${item.name}</td>
                    <td style="text-align: center; padding: 10px 0;">${item.quantity}</td>
                    <td style="text-align: right; padding: 10px 0;">$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="2" style="text-align: right; padding: 10px 0; font-weight: bold;">Total:</td>
                  <td style="text-align: right; padding: 10px 0; font-weight: bold;">$${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Order in Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Please process this order as soon as possible.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
New Order Alert - ${order.order_number}

Hello,

A new order has been placed in your store ${tenant.name}.

Order Details:
- Order Number: ${order.order_number}
- Customer: ${order.name || 'N/A'}
- Email: ${order.email || 'N/A'}
- Phone: ${order.phone || 'N/A'}
- Total Amount: $${totalAmount.toFixed(2)}
- Payment Status: ${order.payment_status}
- Order Date: ${new Date(order.created_at || '').toLocaleDateString()}

Order Items:
${orderItems.map((item) => `- ${item.name} x${item.quantity} - $${item.total.toFixed(2)}`).join('\n')}

Total: $${totalAmount.toFixed(2)}

View order in dashboard: ${dashboardUrl}

Please process this order as soon as possible.
  `;

  return sendEmail({
    to: adminEmail,
    from: getTenantEmailAddress(tenant),
    fromName: tenant.name || 'Store',
    subject: `New Order Alert - ${order.order_number}`,
    html,
    text,
  });
}

/**
 * Send order shipped email to customer
 */
export async function sendOrderShippedEmail({
  order,
  tenant,
  trackingNumber,
  shippingCarrier,
}: {
  order: OrderWithItems;
  tenant: Tenant;
  trackingNumber?: string;
  shippingCarrier?: string;
}) {
  const customerEmail = order.email;
  const customerName = order.name || 'Customer';

  if (!customerEmail) {
    console.warn('No customer email for order', order.order_number);
    return { success: false, error: 'No customer email' };
  }

  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const orderUrl = `${storeUrl}/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Order Has Shipped - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Your Order Has Shipped! 🚚</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customerName},</p>
          
          <p>Great news! Your order <strong>${order.order_number}</strong> has been shipped and is on its way to you.</p>
          
          ${trackingNumber ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="margin-top: 0; color: #10b981;">Tracking Information</h2>
            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
            ${shippingCarrier ? `<p><strong>Carrier:</strong> ${shippingCarrier}</p>` : ''}
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Track Your Order
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact us at <a href="mailto:${getTenantEmailAddress(tenant)}">${getTenantEmailAddress(tenant)}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            ${tenant.name}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    from: getTenantEmailAddress(tenant),
    fromName: tenant.name || 'Store',
    subject: `Your Order Has Shipped - ${order.order_number}`,
    html,
  });
}

/**
 * Send order delivered email to customer
 */
export async function sendOrderDeliveredEmail({
  order,
  tenant,
}: {
  order: OrderWithItems;
  tenant: Tenant;
}) {
  const customerEmail = order.email;
  const customerName = order.name || 'Customer';

  if (!customerEmail) {
    console.warn('No customer email for order', order.order_number);
    return { success: false, error: 'No customer email' };
  }

  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const orderUrl = `${storeUrl}/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Delivered - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Order Delivered! ✅</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customerName},</p>
          
          <p>Your order <strong>${order.order_number}</strong> has been delivered successfully!</p>
          
          <p>We hope you're happy with your purchase. If you have any questions or concerns, please don't hesitate to contact us at <a href="mailto:${getTenantEmailAddress(tenant)}">${getTenantEmailAddress(tenant)}</a>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Thank you for shopping with ${tenant.name}!
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            ${tenant.name}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    from: getTenantEmailAddress(tenant),
    fromName: tenant.name || 'Store',
    subject: `Order Delivered - ${order.order_number}`,
    html,
  });
}

/**
 * Send order cancelled email to customer
 */
export async function sendOrderCancelledEmail({
  order,
  tenant,
  reason,
  refundAmount,
}: {
  order: OrderWithItems;
  tenant: Tenant;
  reason?: string;
  refundAmount?: number;
}) {
  const customerEmail = order.email;
  const customerName = order.name || 'Customer';

  if (!customerEmail) {
    console.warn('No customer email for order', order.order_number);
    return { success: false, error: 'No customer email' };
  }

  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const orderUrl = `${storeUrl}/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Cancelled - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Order Cancelled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customerName},</p>
          
          <p>We're sorry to inform you that your order <strong>${order.order_number}</strong> has been cancelled.</p>
          
          ${reason ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h2 style="margin-top: 0; color: #ef4444;">Cancellation Reason</h2>
            <p>${reason}</p>
          </div>
          ` : ''}
          
          ${refundAmount ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="margin-top: 0; color: #10b981;">Refund Information</h2>
            <p>A refund of <strong>$${refundAmount.toFixed(2)}</strong> will be processed to your original payment method.</p>
            <p>Please allow 5-10 business days for the refund to appear in your account.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${storeUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Continue Shopping
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact us at <a href="mailto:${getTenantEmailAddress(tenant)}">${getTenantEmailAddress(tenant)}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            ${tenant.name}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    from: getTenantEmailAddress(tenant),
    fromName: tenant.name || 'Store',
    subject: `Order Cancelled - ${order.order_number}`,
    html,
  });
}

