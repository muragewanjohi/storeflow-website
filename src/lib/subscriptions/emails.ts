/**
 * Subscription Email Notifications
 * 
 * Email templates and functions for subscription-related notifications
 */

import { sendEmail } from '@/lib/email/sendgrid';
import { getTenantContactEmail } from '@/lib/orders/emails';
import type { Tenant } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma/client';

/**
 * Send subscription renewal reminder email (7 days before expiry)
 */
export async function sendSubscriptionRenewalReminderEmail({
  tenant,
  expireDate,
  plan,
}: {
  tenant: Tenant;
  expireDate: Date;
  plan: { name: string; price: number; duration_months: number } | null;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    const daysUntilExpiry = Math.ceil(
      (expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Renewal Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">Subscription Renewal Reminder</h1>
            <p style="margin: 0;">Your subscription will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Subscription Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Plan:</td>
                <td style="padding: 8px 0;">${plan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Price:</td>
                <td style="padding: 8px 0;">$${plan?.price ? Number(plan.price).toFixed(2) : '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Expires:</td>
                <td style="padding: 8px 0;">${expireDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Renew Subscription
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated reminder from StoreFlow Platform</p>
            <p style="margin: 5px 0 0 0;">Please renew your subscription to avoid service interruption.</p>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: tenantEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com',
      fromName: 'StoreFlow Platform',
      subject: `Subscription Renewal Reminder - Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
      html,
    });
  } catch (error) {
    console.error('Error sending subscription renewal reminder email:', error);
    throw error;
  }
}

/**
 * Send subscription expired email
 */
export async function sendSubscriptionExpiredEmail({
  tenant,
  plan,
}: {
  tenant: Tenant;
  plan: { name: string; price: number; duration_months: number } | null;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Expired</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin-top: 0;">Subscription Expired</h1>
            <p style="margin: 0;">Your subscription has expired. Please renew to continue using the service.</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Subscription Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Plan:</td>
                <td style="padding: 8px 0;">${plan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Price:</td>
                <td style="padding: 8px 0;">$${plan?.price ? Number(plan.price).toFixed(2) : '0.00'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Important:</strong> Your account is currently in a grace period. You have 7 days to renew before your account is suspended.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Renew Subscription Now
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from StoreFlow Platform</p>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: tenantEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com',
      fromName: 'StoreFlow Platform',
      subject: 'Subscription Expired - Renew Now',
      html,
    });
  } catch (error) {
    console.error('Error sending subscription expired email:', error);
    throw error;
  }
}

/**
 * Send subscription activated email
 */
export async function sendSubscriptionActivatedEmail({
  tenant,
  plan,
  expireDate,
}: {
  tenant: Tenant;
  plan: { name: string; price: number; duration_months: number } | null;
  expireDate: Date;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Activated</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
            <h1 style="color: #10b981; margin-top: 0;">Subscription Activated</h1>
            <p style="margin: 0;">Your subscription has been successfully activated!</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Subscription Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Plan:</td>
                <td style="padding: 8px 0;">${plan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Price:</td>
                <td style="padding: 8px 0;">$${plan?.price ? Number(plan.price).toFixed(2) : '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
                <td style="padding: 8px 0;">${plan?.duration_months || 0} month${plan?.duration_months !== 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Expires:</td>
                <td style="padding: 8px 0;">${expireDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated confirmation from StoreFlow Platform</p>
            <p style="margin: 5px 0 0 0;">Thank you for your subscription!</p>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: tenantEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com',
      fromName: 'StoreFlow Platform',
      subject: `Subscription Activated - ${plan?.name || 'Welcome'}`,
      html,
    });
  } catch (error) {
    console.error('Error sending subscription activated email:', error);
    throw error;
  }
}

/**
 * Send payment due reminder email
 */
export async function sendPaymentDueReminderEmail({
  tenant,
  plan,
  amount,
  dueDate,
}: {
  tenant: Tenant;
  plan: { name: string; price: number; duration_months: number } | null;
  amount: number;
  dueDate: Date;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Due Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h1 style="color: #f59e0b; margin-top: 0;">Payment Due Reminder</h1>
            <p style="margin: 0;">A payment is due for your subscription.</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Payment Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Plan:</td>
                <td style="padding: 8px 0;">${plan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Amount Due:</td>
                <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #2563eb;">$${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
                <td style="padding: 8px 0;">${dueDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Make Payment
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated reminder from StoreFlow Platform</p>
            <p style="margin: 5px 0 0 0;">Please make payment to avoid service interruption.</p>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: tenantEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com',
      fromName: 'StoreFlow Platform',
      subject: `Payment Due Reminder - $${amount.toFixed(2)}`,
      html,
    });
  } catch (error) {
    console.error('Error sending payment due reminder email:', error);
    throw error;
  }
}

/**
 * Send plan upgrade confirmation email
 */
export async function sendPlanUpgradeConfirmationEmail({
  tenant,
  oldPlan,
  newPlan,
  expireDate,
}: {
  tenant: Tenant;
  oldPlan: { name: string; price: number } | null;
  newPlan: { name: string; price: number; duration_months: number } | null;
  expireDate: Date;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Upgrade Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
            <h1 style="color: #10b981; margin-top: 0;">Plan Upgrade Confirmed</h1>
            <p style="margin: 0;">Your subscription plan has been successfully upgraded!</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Plan Change Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Previous Plan:</td>
                <td style="padding: 8px 0;">${oldPlan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">New Plan:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #10b981;">${newPlan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">New Price:</td>
                <td style="padding: 8px 0;">$${newPlan?.price ? Number(newPlan.price).toFixed(2) : '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Expires:</td>
                <td style="padding: 8px 0;">${expireDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Subscription
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated confirmation from StoreFlow Platform</p>
            <p style="margin: 5px 0 0 0;">Thank you for upgrading!</p>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: tenantEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com',
      fromName: 'StoreFlow Platform',
      subject: `Plan Upgraded to ${newPlan?.name || 'New Plan'}`,
      html,
    });
  } catch (error) {
    console.error('Error sending plan upgrade confirmation email:', error);
    throw error;
  }
}

