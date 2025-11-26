/**
 * Order Email Notifications
 * 
 * Email templates and functions for order-related notifications
 */

import { sendCustomerEmail, sendAdminEmail } from '@/lib/email/service';
import { prisma } from '@/lib/prisma/client';
import type { orders } from '@prisma/client';
import type { Tenant } from '@/lib/tenant-context';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Get tenant contact email address for customer inquiries
 * Uses the tenant's contact_email field if set, otherwise falls back to support email
 */
export function getTenantContactEmail(tenant: Tenant): string {
  // First priority: use the contact_email field from the tenant record
  if (tenant.contact_email) {
    return tenant.contact_email;
  }

  // Fallback to support email using store's domain
  if (tenant.custom_domain) {
    return `support@${tenant.custom_domain}`;
  }
  return `support@${tenant.subdomain}.dukanest.com`;
}

// Note: getVerifiedSenderEmail() and getSenderName() have been moved to @/lib/email/service
// They are now handled by the unified email service

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
  const contactEmail = getTenantContactEmail(tenant);

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
            If you have any questions about your order, please contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>
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

If you have any questions about your order, please contact us at ${contactEmail}.

Best regards,
${tenant.name}
  `;

  return sendCustomerEmail({
    to: customerEmail,
    subject: `Order Confirmation - ${order.order_number}`,
    html,
    text,
    tenant,
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
  // Get tenant admin email from Supabase Auth for notifications
  // Use contact_email if available, otherwise get admin email
  let adminEmail: string;
  if (tenant.contact_email) {
    adminEmail = tenant.contact_email;
  } else if (tenant.user_id) {
    try {
      const adminClient = createAdminClient();
      const { data: user } = await adminClient.auth.admin.getUserById(tenant.user_id);
      adminEmail = user?.user?.email || `${tenant.subdomain}@dukanest.com`;
    } catch {
      adminEmail = `${tenant.subdomain}@dukanest.com`;
    }
  } else {
    adminEmail = `${tenant.subdomain}@dukanest.com`;
  }

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

  return sendAdminEmail({
    to: adminEmail,
    subject: `New Order Alert - ${order.order_number}`,
    html,
    text,
    tenant,
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
  notes,
}: {
  order: OrderWithItems;
  tenant: Tenant;
  trackingNumber?: string;
  shippingCarrier?: string;
  notes?: string | null;
}) {
  const customerEmail = order.email;
  const customerName = order.name || 'Customer';

  if (!customerEmail) {
    console.warn('No customer email for order', order.order_number);
    return { success: false, error: 'No customer email' };
  }

  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const orderUrl = `${storeUrl}/orders/${order.id}`;
  const contactEmail = getTenantContactEmail(tenant);

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
          
          ${notes ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="margin-top: 0; color: #10b981;">Additional Information</h2>
            <p>${notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Track Your Order
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            ${tenant.name}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendCustomerEmail({
    to: customerEmail,
    subject: `Your Order Has Shipped - ${order.order_number}`,
    html,
    tenant,
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
  const contactEmail = getTenantContactEmail(tenant);

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
          
          <p>We hope you're happy with your purchase. If you have any questions or concerns, please don't hesitate to contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
          
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

  return sendCustomerEmail({
    to: customerEmail,
    subject: `Order Delivered - ${order.order_number}`,
    html,
    tenant,
  });
}

/**
 * Send order status update email to customer
 */
export async function sendOrderStatusUpdateEmail({
  order,
  tenant,
  oldStatus,
  newStatus,
  notes,
}: {
  order: OrderWithItems;
  tenant: Tenant;
  oldStatus: string | null;
  newStatus: string;
  notes?: string | null;
}) {
  const customerEmail = order.email;
  const customerName = order.name || 'Customer';

  if (!customerEmail) {
    console.warn('No customer email for order', order.order_number);
    return { success: false, error: 'No customer email' };
  }

  // Don't send email if status hasn't actually changed
  if (oldStatus === newStatus) {
    return { success: true, skipped: true };
  }

  // Skip emails for statuses that have dedicated email functions
  if (newStatus === 'shipped' || newStatus === 'delivered' || newStatus === 'cancelled') {
    return { success: true, skipped: true };
  }

  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const orderUrl = `${storeUrl}/orders/${order.id}`;
  const contactEmail = getTenantContactEmail(tenant);

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    on_hold: 'On Hold',
    completed: 'Completed',
    refunded: 'Refunded',
  };

  const statusColor: Record<string, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    on_hold: '#ef4444',
    completed: '#10b981',
    refunded: '#6b7280',
  };

  const statusLabel = statusLabels[newStatus] || newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
  const statusBgColor = statusColor[newStatus] || '#667eea';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${statusBgColor} 0%, ${statusBgColor}dd 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Order Status Updated</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customerName},</p>
          
          <p>We wanted to let you know that your order <strong>${order.order_number}</strong> status has been updated.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusBgColor};">
            <h2 style="margin-top: 0; color: ${statusBgColor};">Order Status</h2>
            <p><strong>Previous Status:</strong> ${oldStatus ? (statusLabels[oldStatus] || oldStatus) : 'N/A'}</p>
            <p><strong>Current Status:</strong> <strong style="color: ${statusBgColor};">${statusLabel}</strong></p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" style="background: ${statusBgColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions about your order, please contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>
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
Order Status Update - ${order.order_number}

Hello ${customerName},

We wanted to let you know that your order ${order.order_number} status has been updated.

Order Status:
- Previous Status: ${oldStatus || 'N/A'}
- Current Status: ${statusLabel}
${notes ? `- Notes: ${notes}` : ''}

View your order: ${orderUrl}

If you have any questions about your order, please contact us at ${contactEmail}.

Best regards,
${tenant.name}
  `;

  return sendCustomerEmail({
    to: customerEmail,
    subject: `Order Status Update - ${order.order_number}`,
    html,
    text,
    tenant,
  });
}

/**
 * Send payment status update email to customer
 */
export async function sendPaymentStatusUpdateEmail({
  order,
  tenant,
  oldPaymentStatus,
  newPaymentStatus,
  notes,
}: {
  order: OrderWithItems;
  tenant: Tenant;
  oldPaymentStatus: string | null;
  newPaymentStatus: string;
  notes?: string | null;
}) {
  const customerEmail = order.email;
  const customerName = order.name || 'Customer';

  if (!customerEmail) {
    console.warn('No customer email for order', order.order_number);
    return { success: false, error: 'No customer email' };
  }

  // Don't send email if payment status hasn't actually changed
  if (oldPaymentStatus === newPaymentStatus) {
    return { success: true, skipped: true };
  }

  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const orderUrl = `${storeUrl}/orders/${order.id}`;
  const contactEmail = getTenantContactEmail(tenant);

  const paymentStatusLabels: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  };

  const paymentStatusColor: Record<string, string> = {
    pending: '#f59e0b',
    paid: '#10b981',
    failed: '#ef4444',
    refunded: '#6b7280',
  };

  const paymentLabel = paymentStatusLabels[newPaymentStatus] || newPaymentStatus.charAt(0).toUpperCase() + newPaymentStatus.slice(1);
  const paymentBgColor = paymentStatusColor[newPaymentStatus] || '#667eea';

  let statusMessage = '';
  let statusIcon = '';
  
  if (newPaymentStatus === 'paid') {
    statusMessage = 'Your payment has been confirmed!';
    statusIcon = '✅';
  } else if (newPaymentStatus === 'failed') {
    statusMessage = 'Unfortunately, your payment could not be processed.';
    statusIcon = '❌';
  } else if (newPaymentStatus === 'refunded') {
    statusMessage = 'Your payment has been refunded.';
    statusIcon = '💰';
  } else if (newPaymentStatus === 'pending') {
    statusMessage = 'Your payment is pending confirmation.';
    statusIcon = '⏳';
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Status Update - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${paymentBgColor} 0%, ${paymentBgColor}dd 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Payment Status Update ${statusIcon}</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customerName},</p>
          
          <p>${statusMessage}</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${paymentBgColor};">
            <h2 style="margin-top: 0; color: ${paymentBgColor};">Payment Information</h2>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Previous Payment Status:</strong> ${oldPaymentStatus ? (paymentStatusLabels[oldPaymentStatus] || oldPaymentStatus) : 'N/A'}</p>
            <p><strong>Current Payment Status:</strong> <strong style="color: ${paymentBgColor};">${paymentLabel}</strong></p>
            ${order.transaction_id ? `<p><strong>Transaction ID:</strong> ${order.transaction_id}</p>` : ''}
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
          
          ${newPaymentStatus === 'failed' ? `
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #991b1b;"><strong>What to do next:</strong></p>
            <p style="margin: 5px 0 0 0; color: #991b1b;">Please try again or contact us if you need assistance with your payment.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" style="background: ${paymentBgColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions about your payment, please contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>
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
Payment Status Update - ${order.order_number}

Hello ${customerName},

${statusMessage}

Payment Information:
- Order Number: ${order.order_number}
- Previous Payment Status: ${oldPaymentStatus || 'N/A'}
- Current Payment Status: ${paymentLabel}
${order.transaction_id ? `- Transaction ID: ${order.transaction_id}` : ''}
${notes ? `- Notes: ${notes}` : ''}

${newPaymentStatus === 'failed' ? '\nWhat to do next: Please try again or contact us if you need assistance with your payment.\n' : ''}

View your order: ${orderUrl}

If you have any questions about your payment, please contact us at ${contactEmail}.

Best regards,
${tenant.name}
  `;

  return sendCustomerEmail({
    to: customerEmail,
    subject: `Payment Status Update - ${order.order_number}`,
    html,
    text,
    tenant,
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
  const contactEmail = getTenantContactEmail(tenant);

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
            If you have any questions, please contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            ${tenant.name}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendCustomerEmail({
    to: customerEmail,
    subject: `Order Cancelled - ${order.order_number}`,
    html,
    tenant,
  });
}

