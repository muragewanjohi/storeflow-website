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
  replyTo?: string; // Add reply-to support
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

  const defaultFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com';
  const defaultFromName = process.env.SENDGRID_FROM_NAME || 'Dukanest';
  
  // Try sending with the provided from address first
  let fromEmail = options.from || defaultFromEmail;
  let fromName = options.fromName || defaultFromName;
  let useFallback = false;

  // If using a custom from address that's not the default, we'll try it first
  // and fall back to default if it fails due to sender identity verification
  if (options.from && options.from !== defaultFromEmail) {
    useFallback = true;
  }

  // Build message object
  const msg: any = {
    to: options.to,
    from: {
      email: fromEmail,
      name: fromName,
    },
  };

  // Add reply-to if provided
  if (options.replyTo) {
    msg.replyTo = options.replyTo;
  }

  // Use template if provided
  if (options.templateId) {
    msg.templateId = options.templateId;
    msg.dynamicTemplateData = options.dynamicTemplateData || {};
  } else {
    // Use plain HTML/text
    msg.subject = options.subject || 'Notification from Dukanest';
    if (options.html) {
      msg.html = options.html;
    }
    if (options.text) {
      msg.text = options.text;
    }
  }

  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully to ${options.to} from ${fromEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    
    // Log detailed error if available
    if (error.response) {
      console.error('SendGrid response error:', error.response.body);
    }

    // If the error is due to sender identity verification and we have a fallback, retry with default
    if (useFallback && error.response?.body?.errors) {
      const senderIdentityError = error.response.body.errors.find(
        (e: any) => e.message?.includes('verified Sender Identity') || e.field === 'from'
      );

      if (senderIdentityError) {
        console.warn(
          `Sender identity not verified for ${fromEmail}. Falling back to default: ${defaultFromEmail}`
        );
        
        // Retry with default verified email
        try {
          const fallbackMsg: any = {
            ...msg,
            from: {
              email: defaultFromEmail,
              name: fromName, // Keep the tenant name for branding
            },
          };

          await sgMail.send(fallbackMsg);
          console.log(`Email sent successfully to ${options.to} using fallback address ${defaultFromEmail}`);
          return { success: true, usedFallback: true };
        } catch (fallbackError: any) {
          console.error('SendGrid fallback error:', fallbackError);
          return { 
            success: false, 
            error: fallbackError.message || 'Failed to send email even with fallback' 
          };
        }
      }
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
}: {
  to: string;
  userName: string;
  tenantName: string;
  subdomain: string;
  loginUrl: string;
  role: string;
  customDomain?: string | null;
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
          
          <p>Please check your email for a confirmation link to activate your account. Once confirmed, you can access your dashboard using the details below.</p>
          
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
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Important:</strong> Please check your email and click the confirmation link to activate your account before logging in.
          </p>
          
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

Please check your email for a confirmation link to activate your account. Once confirmed, you can access your dashboard using the details below.

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
