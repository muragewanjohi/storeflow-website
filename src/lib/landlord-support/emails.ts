/**
 * Landlord Support Ticket Email Notifications
 * 
 * Email templates and functions for landlord support ticket-related notifications
 * These are tickets from tenants to the landlord/platform admin
 */

import { sendPlatformEmail, sendAdminEmail } from '@/lib/email/service';
import type { Tenant } from '@/lib/tenant-context';

/**
 * Get landlord admin email for support notifications
 */
async function getLandlordAdminEmail(): Promise<string> {
  const { prisma } = await import('@/lib/prisma/client');
  
  // Get landlord admin user
  const adminUser = await prisma.admins.findFirst({
    where: {
      role: 'admin',
      status: 'active',
    },
    select: {
      email: true,
    },
    orderBy: {
      created_at: 'asc', // Get the first admin (primary admin)
    },
  });

  if (adminUser?.email) {
    return adminUser.email;
  }

  // Fallback
  return process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com';
}

/**
 * Send email notification when a tenant creates a new ticket for the landlord
 * Sent to: Landlord admin
 */
export async function sendNewLandlordTicketEmail({
  ticket,
  tenant,
}: {
  ticket: any; // landlord_support_tickets type
  tenant: Tenant;
}) {
  try {
    const adminEmail = await getLandlordAdminEmail();
    const priorityLabels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    };

    const categoryLabels: Record<string, string> = {
      billing: 'Billing',
      technical: 'Technical',
      feature_request: 'Feature Request',
      bug_report: 'Bug Report',
      account: 'Account',
      other: 'Other',
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Support Ticket from Tenant</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">New Support Ticket from Tenant</h1>
            <p style="margin: 0;">A tenant has created a support ticket and needs your assistance.</p>
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
                <td style="padding: 8px 0; font-weight: bold;">Tenant:</td>
                <td style="padding: 8px 0;">${tenant.name || tenant.subdomain}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Subdomain:</td>
                <td style="padding: 8px 0;">${tenant.subdomain}</td>
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
              ${ticket.category ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Category:</td>
                <td style="padding: 8px 0;">${categoryLabels[ticket.category] || ticket.category}</td>
              </tr>
              ` : ''}
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
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/support/tickets/${ticket.id}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Ticket
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from StoreFlow Platform</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: adminEmail,
      subject: `New Support Ticket from ${tenant.name || tenant.subdomain}: ${ticket.subject || 'No Subject'}`,
      html,
    });
  } catch (error) {
    console.error('Error sending new landlord ticket email:', error);
    throw error;
  }
}

/**
 * Send email notification when a ticket receives a reply
 * Sent to: Tenant (if landlord replied) or Landlord (if tenant replied)
 */
export async function sendLandlordTicketReplyEmail({
  ticket,
  tenant,
  message,
  isFromTenant,
}: {
  ticket: any;
  tenant: Tenant;
  message: string;
  isFromTenant: boolean;
}) {
  try {
    // If tenant replied, notify landlord
    if (isFromTenant) {
      const adminEmail = await getLandlordAdminEmail();
      
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
              <p style="margin: 0;">${tenant.name || tenant.subdomain} has replied to support ticket #${ticket.id.substring(0, 8)}.</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Ticket: ${ticket.subject || 'No subject'}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">From: ${tenant.name || tenant.subdomain}</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Reply</h2>
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/support/tickets/${ticket.id}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Ticket
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
              <p style="margin: 0;">This is an automated notification from StoreFlow Platform</p>
            </div>
          </body>
        </html>
      `;

      return sendPlatformEmail({
        to: adminEmail,
        subject: `New Reply: ${ticket.subject || 'Support Ticket'}`,
        html,
      });
    } else {
      // Landlord replied, notify tenant
      if (!tenant.contact_email) {
        console.warn('Tenant contact email not found, cannot send reply notification');
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
              <p style="margin: 0;">You have received a reply from the StoreFlow support team.</p>
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
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/support/landlord-tickets/${ticket.id}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Ticket
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
              <p style="margin: 0;">This is an automated notification from StoreFlow Platform</p>
              <p style="margin: 5px 0 0 0;">If you have any questions, please reply to this email or contact our support team.</p>
            </div>
          </body>
        </html>
      `;

      const adminEmail = await getLandlordAdminEmail();
      return sendPlatformEmail({
        to: tenant.contact_email || adminEmail,
        subject: `Reply to Your Support Ticket: ${ticket.subject || 'Support Request'}`,
        html,
      });
    }
  } catch (error) {
    console.error('Error sending landlord ticket reply email:', error);
    throw error;
  }
}

/**
 * Send email notification when ticket status is updated
 * Sent to: Tenant
 */
export async function sendLandlordTicketStatusUpdateEmail({
  ticket,
  tenant,
  oldStatus,
  newStatus,
}: {
  ticket: any;
  tenant: Tenant;
  oldStatus: string | null;
  newStatus: string;
}) {
  try {
    if (!tenant.contact_email) {
      console.warn('Tenant contact email not found, cannot send status update notification');
      return;
    }

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
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/support/landlord-tickets/${ticket.id}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Ticket
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from StoreFlow Platform</p>
          </div>
        </body>
      </html>
    `;

    const adminEmail = await getLandlordAdminEmail();
    return sendPlatformEmail({
      to: tenant.contact_email || adminEmail,
      subject: `Support Ticket Status Updated: ${ticket.subject || 'Support Request'}`,
      html,
    });
  } catch (error) {
    console.error('Error sending landlord ticket status update email:', error);
    throw error;
  }
}

