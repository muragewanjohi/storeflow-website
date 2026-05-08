/**
 * Email Utility (Resend-backed)
 *
 * Keeps the historical `sendgrid.ts` module path for backward compatibility
 * while using Resend as the delivery provider.
 */

import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  from?: string;
  fromName?: string;
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string; // Add reply-to support
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  skipped?: boolean;
  usedFallback?: boolean;
  error?: string;
}

/**
 * Send an email via Resend.
 *
 * Environment precedence:
 * 1) RESEND_API_KEY (preferred)
 * 2) SENDGRID_API_KEY (legacy fallback variable name for compatibility)
 */
export async function sendEmail(options: EmailOptions): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;

  // Skip sending if API key is not configured (development/testing)
  if (!apiKey) {
    console.warn('Resend API key not configured. Email not sent:', options);
    return { success: true, skipped: true, usedFallback: false };
  }

  const defaultFromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.SENDGRID_FROM_EMAIL ||
    'noreply@dukanest.com';
  const defaultFromName =
    process.env.RESEND_FROM_NAME ||
    process.env.SENDGRID_FROM_NAME ||
    'Dukanest';

  const fromEmail = options.from || defaultFromEmail;
  const fromName = options.fromName || defaultFromName;

  const resend = new Resend(apiKey);

  // Resend does not use SendGrid-style template IDs, so ignore safely.
  if (options.templateId) {
    console.warn(
      'templateId/dynamicTemplateData are not supported by Resend in this adapter; sending standard content instead.'
    );
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  const payload: Record<string, string> = {
    from,
    to: options.to,
    subject: options.subject || 'Notification from Dukanest',
  };

  if (options.html) {
    payload.html = options.html;
  }

  if (options.text) {
    payload.text = options.text;
  }

  if (options.replyTo) {
    payload.replyTo = options.replyTo;
  }

  try {
    const { error } = await resend.emails.send(payload as any);
    if (error) {
      console.error('Resend error:', error);
      return {
        success: false,
        usedFallback: false,
        error: error.message || 'Failed to send email',
      };
    }

    console.log(`Email sent successfully to ${options.to} from ${fromEmail}`);
    return { success: true, usedFallback: false };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to send email';
    console.error('Resend send error:', error);
    return {
      success: false,
      usedFallback: false,
      error: message,
    };
  }
}

/**
 * Send welcome email to tenant admin
 */
export async function sendWelcomeEmail({
  to,
  tenantName,
  subdomain,
  adminName,
  loginUrl,
}: {
  to: string;
  tenantName: string;
  subdomain: string;
  adminName: string;
  loginUrl: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Dukanest</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to Dukanest!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${adminName},</p>
          
          <p>Congratulations! Your store <strong>${tenantName}</strong> has been successfully created on Dukanest.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Your Store Details</h2>
            <p><strong>Store Name:</strong> ${tenantName}</p>
            <p><strong>Store URL:</strong> <a href="https://${subdomain}.dukanest.com">https://${subdomain}.dukanest.com</a></p>
            <p><strong>Admin Dashboard:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
          </div>
          
          <p>You can now:</p>
          <ul>
            <li>Access your admin dashboard to manage your store</li>
            <li>Add products and start selling</li>
            <li>Customize your store settings</li>
            <li>Invite team members to help manage your store</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact our support team.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Dukanest Team
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to Dukanest!

Hello ${adminName},

Congratulations! Your store ${tenantName} has been successfully created on Dukanest.

Your Store Details:
- Store Name: ${tenantName}
- Store URL: https://${subdomain}.dukanest.com
- Admin Dashboard: ${loginUrl}

You can now:
- Access your admin dashboard to manage your store
- Add products and start selling
- Customize your store settings
- Invite team members to help manage your store

Visit your dashboard: ${loginUrl}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Dukanest Team
  `;

  return sendEmail({
    to,
    subject: `Welcome to Dukanest - ${tenantName} is Ready!`,
    html,
    text,
  });
}

/**
 * Send welcome email to new tenant user (admin/staff)
 * Includes store details for easy reference
 */
export async function sendUserWelcomeEmail({
  to,
  userName,
  tenantName,
  subdomain,
  loginUrl,
  role,
  customDomain,
  confirmationLink,
}: {
  to: string;
  userName: string;
  tenantName: string;
  subdomain: string;
  loginUrl: string;
  role: string;
  customDomain?: string | null;
  confirmationLink?: string;
}) {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const storeUrl = customDomain 
    ? `${protocol}://${customDomain}`
    : `${protocol}://${subdomain}.${baseDomain}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${tenantName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to ${tenantName}!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${userName},</p>
          
          <p>You have been added as a <strong>${role === 'tenant_admin' ? 'Store Admin' : 'Staff Member'}</strong> to <strong>${tenantName}</strong> on Dukanest.</p>
          
          ${confirmationLink ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="margin-top: 0; color: #10b981;">Confirm Your Account</h2>
            <p>Please click the button below to confirm your email address and activate your account:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${confirmationLink}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Confirm Your Email
              </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              Or copy and paste this link into your browser:<br>
              <a href="${confirmationLink}" style="color: #667eea; word-break: break-all;">${confirmationLink}</a>
            </p>
          </div>
          ` : `
          <p>Please check your email for a confirmation link to activate your account. Once confirmed, you can access your dashboard using the details below.</p>
          `}
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Store Details</h2>
            <p><strong>Store Name:</strong> ${tenantName}</p>
            <p><strong>Store URL:</strong> <a href="${storeUrl}">${storeUrl}</a></p>
            <p><strong>Admin Dashboard:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p><strong>Your Role:</strong> ${role === 'tenant_admin' ? 'Store Admin' : 'Staff Member'}</p>
          </div>
          
          <p>Once your account is confirmed, you can:</p>
          <ul>
            <li>Access your admin dashboard to manage the store</li>
            <li>Add and manage products</li>
            <li>View and process orders</li>
            <li>Manage customers</li>
            ${role === 'tenant_admin' ? '<li>Configure store settings</li>' : ''}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          ${confirmationLink ? '' : `
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Important:</strong> Please check your email and click the confirmation link to activate your account before logging in.
          </p>
          `}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact the store owner or our support team.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Dukanest Team
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to ${tenantName}!

Hello ${userName},

You have been added as a ${role === 'tenant_admin' ? 'Store Admin' : 'Staff Member'} to ${tenantName} on Dukanest.

${confirmationLink ? `
CONFIRM YOUR ACCOUNT:
Please click the link below to confirm your email address and activate your account:
${confirmationLink}

` : `
Please check your email for a confirmation link to activate your account. Once confirmed, you can access your dashboard using the details below.

`}
Store Details:
- Store Name: ${tenantName}
- Store URL: ${storeUrl}
- Admin Dashboard: ${loginUrl}
- Your Role: ${role === 'tenant_admin' ? 'Store Admin' : 'Staff Member'}

Once your account is confirmed, you can:
- Access your admin dashboard to manage the store
- Add and manage products
- View and process orders
- Manage customers
${role === 'tenant_admin' ? '- Configure store settings' : ''}

Visit your dashboard: ${loginUrl}

Important: Please check your email and click the confirmation link to activate your account before logging in.

If you have any questions, please contact the store owner or our support team.

Best regards,
The Dukanest Team
  `;

  return sendEmail({
    to,
    subject: `Welcome to ${tenantName} - Your Account Details`,
    html,
    text,
  });
}
