/**
 * Support Ticket Email Notifications
 * 
 * Email templates and functions for support ticket-related notifications
 */

import { sendCustomerEmail, sendAdminEmail } from '@/lib/email/service';
import { prisma } from '@/lib/prisma/client';
import type { Tenant } from '@/lib/tenant-context';
import { getTenantContactEmail } from '@/lib/orders/emails';
import type { Prisma } from '@prisma/client';

// Define support ticket type based on Prisma model result
type SupportTicketType = Prisma.support_ticketsGetPayload<{
  include: {
    customers: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

/**
 * Get tenant admin email for support notifications
 */
async function getTenantAdminEmail(tenant: Tenant): Promise<string> {
  // Use tenant's contact_email if available
  if (tenant.contact_email) {
    return tenant.contact_email;
  }

  // Note: Tenant admins are stored in Supabase auth, not in Prisma
  // We can't query them directly, so we use the tenant's contact_email as fallback
  // Final fallback
  return process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com';
}

// Note: tenantEmail usage has been replaced with unified email service
// The service automatically handles reply-to addresses

/**
 * Send email notification when a new ticket is created
 * Sent to: Tenant admin
 */
export async function sendNewTicketEmail({
  ticket,
  tenant,
  customer,
}: {
  ticket: SupportTicketType & { customers?: { id: string; name: string | null; email: string | null } | null };
  tenant: Tenant;
  customer: { id: string; name: string | null; email: string | null } | null;
}) {
  try {
    const adminEmail = await getTenantAdminEmail(tenant);
    const tenantEmail = getTenantContactEmail(tenant);
    const customerName = customer?.name || customer?.email || 'Customer';
    const priorityLabels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Support Ticket</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">New Support Ticket</h1>
            <p style="margin: 0;">A new support ticket has been created and requires your attention.</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Ticket Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Ticket ID:</td>
                <td style="padding: 8px 0;">${ticket.id.substring(0, 8)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 8px 0;">${ticket.subject || 'No subject'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Customer:</td>
                <td style="padding: 8px 0;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                <td style="padding: 8px 0;">
                  <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: ${
                    ticket.priority === 'urgent' ? '#dc2626' :
                    ticket.priority === 'high' ? '#ea580c' :
                    ticket.priority === 'medium' ? '#f59e0b' : '#10b981'
                  }; color: white; font-size: 12px; font-weight: bold;">
                    ${priorityLabels[ticket.priority || 'medium']}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0;">${ticket.status || 'open'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Description</h2>
            <p style="margin: 0; white-space: pre-wrap;">${ticket.description || 'No description provided'}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/support/tickets/${ticket.id}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Ticket
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from ${tenant.name || 'Store'}</p>
          </div>
        </body>
      </html>
    `;

    return sendAdminEmail({
      to: adminEmail,
      subject: `New Support Ticket: ${ticket.subject || 'No Subject'}`,
      html,
      tenant,
    });
  } catch (error) {
    console.error('Error sending new ticket email:', error);
    throw error;
  }
}

/**
 * Send email notification when a ticket receives a reply
 * Sent to: Customer (if admin replied) or Admin (if customer replied)
 */
export async function sendTicketReplyEmail({
  ticket,
  tenant,
  message,
  isFromCustomer,
  customer,
}: {
  ticket: SupportTicketType & { customers?: { id: string; name: string | null; email: string | null } | null };
  tenant: Tenant;
  message: string;
  isFromCustomer: boolean;
  customer: { id: string; name: string | null; email: string | null } | null;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    
    // If customer replied, notify admin
    if (isFromCustomer) {
      const adminEmail = await getTenantAdminEmail(tenant);
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Reply on Support Ticket</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #2563eb; margin-top: 0;">New Reply on Support Ticket</h1>
              <p style="margin: 0;">A customer has replied to support ticket #${ticket.id.substring(0, 8)}.</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Ticket: ${ticket.subject || 'No subject'}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">From: ${customer?.name || customer?.email || 'Customer'}</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Reply</h2>
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/support/tickets/${ticket.id}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Ticket
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
              <p style="margin: 0;">This is an automated notification from ${tenant.name || 'Store'}</p>
            </div>
          </body>
        </html>
      `;

      return sendAdminEmail({
        to: adminEmail,
        subject: `New Reply: ${ticket.subject || 'Support Ticket'}`,
        html,
        tenant,
      });
    } else {
      // Admin replied, notify customer
      if (!customer?.email) {
        console.warn('Customer email not found, cannot send reply notification');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reply to Your Support Ticket</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #2563eb; margin-top: 0;">Reply to Your Support Ticket</h1>
              <p style="margin: 0;">You have received a reply to your support ticket.</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Ticket: ${ticket.subject || 'No subject'}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Ticket ID: #${ticket.id.substring(0, 8)}</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Reply</h2>
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Ticket
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
              <p style="margin: 0;">This is an automated notification from ${tenant.name || 'Store'}</p>
              <p style="margin: 5px 0 0 0;">If you have any questions, please reply to this email or contact our support team.</p>
            </div>
          </body>
        </html>
      `;

      return sendCustomerEmail({
        to: customer.email,
        subject: `Reply to Your Support Ticket: ${ticket.subject || 'Support Request'}`,
        html,
        tenant,
      });
    }
  } catch (error) {
    console.error('Error sending ticket reply email:', error);
    throw error;
  }
}

/**
 * Send email notification when ticket status is updated
 * Sent to: Customer
 */
export async function sendTicketStatusUpdateEmail({
  ticket,
  tenant,
  customer,
  oldStatus,
  newStatus,
}: {
  ticket: SupportTicketType & { customers?: { id: string; name: string | null; email: string | null } | null };
  tenant: Tenant;
  customer: { id: string; name: string | null; email: string | null } | null;
  oldStatus: string | null;
  newStatus: string;
}) {
  try {
    if (!customer?.email) {
      console.warn('Customer email not found, cannot send status update notification');
      return;
    }

    const tenantEmail = getTenantContactEmail(tenant);
    const statusLabels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Ticket Status Updated</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">Support Ticket Status Updated</h1>
            <p style="margin: 0;">Your support ticket status has been updated.</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Ticket: ${ticket.subject || 'No subject'}</h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Ticket ID: #${ticket.id.substring(0, 8)}</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Status Update</h2>
            <p style="margin: 0;">
              <strong>Previous Status:</strong> ${statusLabels[oldStatus || 'open'] || oldStatus || 'Open'}<br>
              <strong>New Status:</strong> 
              <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: ${
                newStatus === 'resolved' ? '#10b981' :
                newStatus === 'closed' ? '#6b7280' :
                newStatus === 'in_progress' ? '#2563eb' : '#f59e0b'
              }; color: white; font-size: 12px; font-weight: bold; margin-left: 8px;">
                ${statusLabels[newStatus] || newStatus}
              </span>
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Ticket
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from ${tenant.name || 'Store'}</p>
          </div>
        </body>
      </html>
    `;

    return sendCustomerEmail({
      to: customer.email,
      subject: `Support Ticket Status Updated: ${ticket.subject || 'Support Request'}`,
      html,
      tenant,
    });
  } catch (error) {
    console.error('Error sending ticket status update email:', error);
    throw error;
  }
}

/**
 * Send email notification when ticket is assigned to a staff member
 * Sent to: Assigned staff member
 */
export async function sendTicketAssignedEmail({
  ticket,
  tenant,
  staffEmail,
  staffName,
}: {
  ticket: SupportTicketType & { customers?: { id: string; name: string | null; email: string | null } | null };
  tenant: Tenant;
  staffEmail: string;
  staffName?: string;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    const customerName = ticket.customers?.name || ticket.customers?.email || 'Customer';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Ticket Assigned to You</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">Support Ticket Assigned to You</h1>
            <p style="margin: 0;">A support ticket has been assigned to you.</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Ticket Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Ticket ID:</td>
                <td style="padding: 8px 0;">${ticket.id.substring(0, 8)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 8px 0;">${ticket.subject || 'No subject'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Customer:</td>
                <td style="padding: 8px 0;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                <td style="padding: 8px 0;">${ticket.priority || 'medium'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Description</h2>
            <p style="margin: 0; white-space: pre-wrap;">${ticket.description || 'No description provided'}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/support/tickets/${ticket.id}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Ticket
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from ${tenant.name || 'Store'}</p>
          </div>
        </body>
      </html>
    `;

    return sendAdminEmail({
      to: staffEmail,
      subject: `Support Ticket Assigned: ${ticket.subject || 'No Subject'}`,
      html,
      tenant,
    });
  } catch (error) {
    console.error('Error sending ticket assigned email:', error);
    throw error;
  }
}

