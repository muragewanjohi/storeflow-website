/**
 * SendGrid Email Utility
 * 
 * Handles sending transactional emails via SendGrid
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  from?: string;
  fromName?: string;
  subject?: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(options: EmailOptions) {
  // Skip sending if API key is not configured (development)
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent:', options);
    return { success: true, skipped: true };
  }

  try {
    const msg: any = {
      to: options.to,
      from: {
        email: options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com',
        name: options.fromName || process.env.SENDGRID_FROM_NAME || 'StoreFlow',
      },
    };

    // Use template if provided
    if (options.templateId) {
      msg.templateId = options.templateId;
      msg.dynamicTemplateData = options.dynamicTemplateData || {};
    } else {
      // Use plain HTML/text
      msg.subject = options.subject || 'Notification from StoreFlow';
      if (options.html) {
        msg.html = options.html;
      }
      if (options.text) {
        msg.text = options.text;
      }
    }

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${options.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    
    // Log detailed error if available
    if (error.response) {
      console.error('SendGrid response error:', error.response.body);
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
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
        <title>Welcome to StoreFlow</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to StoreFlow!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${adminName},</p>
          
          <p>Congratulations! Your store <strong>${tenantName}</strong> has been successfully created on StoreFlow.</p>
          
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
            The StoreFlow Team
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to StoreFlow!

Hello ${adminName},

Congratulations! Your store ${tenantName} has been successfully created on StoreFlow.

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
The StoreFlow Team
  `;

  return sendEmail({
    to,
    subject: `Welcome to StoreFlow - ${tenantName} is Ready!`,
    html,
    text,
  });
}

