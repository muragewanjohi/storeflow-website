/**
 * Subscription Email Notifications
 * 
 * Email templates and functions for subscription-related notifications
 */

import { sendPlatformEmail } from '@/lib/email/service';
import { getTenantContactEmail } from '@/lib/orders/emails';
import type { Tenant } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma/client';
import { getTenantPaymentUrl } from './tenant-url';
import { resolvePlanMonthlyPrice } from '@/lib/pricing/location';

type SubscriptionEmailPlan = {
  name: string;
  price: number;
  price_kes?: number | null;
  duration_months: number;
  currency?: 'KES' | 'USD';
  currencySymbol?: 'Ksh' | '$';
};

/**
 * Send subscription renewal reminder email (7 days before expiry)
 */
export async function sendSubscriptionRenewalReminderEmail({
  tenant,
  expireDate,
  plan,
  isKenya = false,
}: {
  tenant: Tenant;
  expireDate: Date;
  plan: SubscriptionEmailPlan | null;
  isKenya?: boolean;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    const daysUntilExpiry = Math.ceil(
      (expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine pricing for Kenya vs others
    const currency = isKenya ? 'KES' : (plan?.currency || 'USD');
    const currencySymbol = isKenya ? 'Ksh' : (plan?.currencySymbol || '$');
    const price = plan 
      ? resolvePlanMonthlyPrice({ price: plan.price, price_kes: plan.price_kes }, isKenya)
      : 0;
    const paymentUrl = getTenantPaymentUrl(tenant);

    // Build store URL
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.${baseDomain}`;

    const formattedPrice = price 
      ? (currencySymbol === 'Ksh' 
          ? `Ksh ${Number(price).toLocaleString('en-KE')}`
          : `${currencySymbol}${Number(price).toFixed(2)}`)
      : '$0.00';

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

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Store Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Store Name:</td>
                <td style="padding: 6px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Store URL:</td>
                <td style="padding: 6px 0;"><a href="${storeUrl}" style="color: #2563eb; text-decoration: none;">${storeUrl}</a></td>
              </tr>
            </table>
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
                <td style="padding: 8px 0;">${formattedPrice}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Currency:</td>
                <td style="padding: 8px 0;">${currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Expires:</td>
                <td style="padding: 8px 0;">${expireDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${paymentUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Renew Subscription
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated reminder from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0;">Please renew your subscription to avoid service interruption.</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Subscription Renewal Reminder - ${tenant.name} - Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
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
  isKenya = false,
}: {
  tenant: Tenant;
  plan: SubscriptionEmailPlan | null;
  isKenya?: boolean;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    const gracePeriodDays = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '2');
    const paymentUrl = getTenantPaymentUrl(tenant);

    // Determine pricing for Kenya vs others
    const currency = isKenya ? 'KES' : (plan?.currency || 'USD');
    const currencySymbol = isKenya ? 'Ksh' : (plan?.currencySymbol || '$');
    const price = plan 
      ? resolvePlanMonthlyPrice({ price: plan.price, price_kes: plan.price_kes }, isKenya)
      : 0;

    const formattedPrice = price 
      ? (currencySymbol === 'Ksh' 
          ? `Ksh ${Number(price).toLocaleString('en-KE')}`
          : `${currencySymbol}${Number(price).toFixed(2)}`)
      : '$0.00';

    // Build store URL
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.${baseDomain}`;

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

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Store Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Store Name:</td>
                <td style="padding: 6px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Store URL:</td>
                <td style="padding: 6px 0;"><a href="${storeUrl}" style="color: #2563eb; text-decoration: none;">${storeUrl}</a></td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Subscription Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Plan:</td>
                <td style="padding: 8px 0;">${plan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Renewal Price:</td>
                <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #dc2626;">${formattedPrice}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Currency:</td>
                <td style="padding: 8px 0;">${currency}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Important:</strong> Your account is currently in a grace period. You have ${gracePeriodDays} day${gracePeriodDays !== 1 ? 's' : ''} to renew before your account is suspended.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${paymentUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Renew Subscription Now
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Subscription Expired - ${tenant.name} - Renew Now`,
      html,
    });
  } catch (error) {
    console.error('Error sending subscription expired email:', error);
    throw error;
  }
}

/**
 * Send subscription suspended email (after grace period)
 */
export async function sendSubscriptionSuspendedEmail({
  tenant,
  plan,
  isKenya = false,
}: {
  tenant: Tenant;
  plan: SubscriptionEmailPlan | null;
  isKenya?: boolean;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    const paymentUrl = getTenantPaymentUrl(tenant);

    // Determine pricing for Kenya vs others
    const currency = isKenya ? 'KES' : (plan?.currency || 'USD');
    const currencySymbol = isKenya ? 'Ksh' : (plan?.currencySymbol || '$');
    const price = plan 
      ? resolvePlanMonthlyPrice({ price: plan.price, price_kes: plan.price_kes }, isKenya)
      : 0;

    const formattedPrice = price 
      ? (currencySymbol === 'Ksh' 
          ? `Ksh ${Number(price).toLocaleString('en-KE')}`
          : `${currencySymbol}${Number(price).toFixed(2)}`)
      : '$0.00';

    // Build store URL
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.${baseDomain}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin-top: 0;">Account Suspended</h1>
            <p style="margin: 0;">Your subscription grace period has ended and your account has been suspended.</p>
          </div>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Store Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Store Name:</td>
                <td style="padding: 6px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Store URL:</td>
                <td style="padding: 6px 0;"><a href="${storeUrl}" style="color: #2563eb; text-decoration: none;">${storeUrl}</a></td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">What This Means</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Your storefront is no longer accessible to customers</li>
              <li>Dashboard access is restricted to renewal pages only</li>
              <li>All your data is preserved and safe</li>
              <li>You can restore access immediately by renewing</li>
            </ul>
          </div>

          <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Your Data is Safe:</strong> All your products, orders, customers, and settings have been preserved. 
              They will be immediately available when you renew your subscription.
            </p>
          </div>

          ${plan ? `
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Subscription Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Plan:</td>
                <td style="padding: 8px 0;">${plan.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Renewal Price:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${formattedPrice}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Currency:</td>
                <td style="padding: 8px 0;">${currency}</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px;">
            <a href="${paymentUrl}" 
               style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Restore Access Now
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0;">Need help? Contact our support team for assistance with renewal.</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Account Suspended - ${tenant.name} - Restore Access Now`,
      html,
    });
  } catch (error) {
    console.error('Error sending subscription suspended email:', error);
    throw error;
  }
}

/**
 * Send pre-hard-deletion warning email
 * Sent to tenants before their account is permanently deleted
 */
export async function sendPreDeletionWarningEmail({
  tenant,
  daysUntilDeletion,
}: {
  tenant: Tenant;
  daysUntilDeletion: number;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    const retentionDays = parseInt(process.env.TENANT_RETENTION_DAYS || '90');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deletion Warning</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin-top: 0;">⚠️ Final Warning: Account Deletion</h1>
            <p style="margin: 0; font-size: 16px;">
              Your account will be permanently deleted in ${daysUntilDeletion} day${daysUntilDeletion !== 1 ? 's' : ''}.
            </p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">What This Means</h2>
            <p style="margin: 0 0 15px 0;">
              Your account was deleted ${retentionDays - daysUntilDeletion} days ago and is currently in a ${retentionDays}-day retention period. 
              After ${daysUntilDeletion} day${daysUntilDeletion !== 1 ? 's' : ''}, your account and all associated data will be permanently removed and cannot be recovered.
            </p>
            <ul style="margin: 0; padding-left: 20px;">
              <li>All products, orders, and customer data will be permanently deleted</li>
              <li>Your storefront and subdomain will be removed</li>
              <li>All files and media will be deleted</li>
              <li><strong>This action cannot be undone</strong></li>
            </ul>
          </div>

          <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Important:</strong> If you want to recover your account, you must contact support immediately. 
              Once the ${retentionDays}-day retention period expires, all data will be permanently deleted and cannot be restored.
            </p>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Data Export:</strong> If you need to backup your data, please contact our support team immediately. 
              We can provide data exports for your records before permanent deletion.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:support@dukanest.com?subject=Account Recovery Request - ${tenant.name}" 
               style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
              Contact Support Now
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated warning from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0;">
              Account: ${tenant.name} (${tenant.subdomain})<br/>
              Deletion Date: ${daysUntilDeletion} day${daysUntilDeletion !== 1 ? 's' : ''} from now
            </p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `⚠️ Final Warning: Account Deletion in ${daysUntilDeletion} Day${daysUntilDeletion !== 1 ? 's' : ''}`,
      html,
    });
  } catch (error) {
    console.error('Error sending pre-deletion warning email:', error);
    throw error;
  }
}

/**
 * Send account deletion confirmation email with restore instructions
 */
export async function sendAccountDeletionConfirmationEmail({
  tenant,
  deletedAt,
  retentionDays,
}: {
  tenant: Tenant;
  deletedAt: Date;
  retentionDays: number;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);
    const finalDeletionDate = new Date(deletedAt);
    finalDeletionDate.setDate(finalDeletionDate.getDate() + retentionDays);

    const supportEmail = 'support@dukanest.com';
    const subject = `Account Restore Request - ${tenant.name} (${tenant.subdomain})`;
    const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deletion Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin-top: 0;">Your store is now deactivated</h1>
            <p style="margin: 0;">
              We received and processed your account deletion request.
            </p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Account Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 180px;">Store Name:</td>
                <td style="padding: 8px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Store Subdomain:</td>
                <td style="padding: 8px 0;">${tenant.subdomain}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Deleted At:</td>
                <td style="padding: 8px 0;">${deletedAt.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Permanent Deletion Date:</td>
                <td style="padding: 8px 0;"><strong>${finalDeletionDate.toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Need to restore your account?</strong><br/>
              You can request account restoration within the next ${retentionDays} days by emailing
              <a href="mailto:${supportEmail}" style="color: #1e40af;">${supportEmail}</a>.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${mailto}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Email Support to Restore Account
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated confirmation from DukaNest Platform.</p>
            <p style="margin: 5px 0 0 0;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Account deletion confirmation - ${tenant.name}`,
      html,
    });
  } catch (error) {
    console.error('Error sending account deletion confirmation email:', error);
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
  isKenya = false,
}: {
  tenant: Tenant;
  plan: SubscriptionEmailPlan | null;
  expireDate: Date;
  isKenya?: boolean;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    // Determine pricing for Kenya vs others
    const currency = isKenya ? 'KES' : (plan?.currency || 'USD');
    const currencySymbol = isKenya ? 'Ksh' : (plan?.currencySymbol || '$');
    const price = plan 
      ? resolvePlanMonthlyPrice({ price: plan.price, price_kes: plan.price_kes }, isKenya)
      : 0;

    const formattedPrice = price 
      ? (currencySymbol === 'Ksh' 
          ? `Ksh ${Number(price).toLocaleString('en-KE')}`
          : `${currencySymbol}${Number(price).toFixed(2)}`)
      : 'N/A';

    // Build store URL
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.${baseDomain}`;
    const dashboardUrl = `${storeUrl}/dashboard`;

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

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Store Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Store Name:</td>
                <td style="padding: 6px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Store URL:</td>
                <td style="padding: 6px 0;"><a href="${storeUrl}" style="color: #2563eb; text-decoration: none;">${storeUrl}</a></td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Subscription Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Plan:</td>
                <td style="padding: 8px 0;">${plan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Amount Paid:</td>
                <td style="padding: 8px 0; color: #10b981; font-weight: bold;">${formattedPrice}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Currency:</td>
                <td style="padding: 8px 0;">${currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
                <td style="padding: 8px 0;">${plan?.duration_months != null ? plan.duration_months : 0} month${plan?.duration_months !== 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Expires:</td>
                <td style="padding: 8px 0;">${expireDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${dashboardUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated confirmation from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0;">Thank you for your subscription!</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Subscription Activated - ${tenant.name} - ${plan?.name || 'Welcome'}`,
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
  isKenya = false,
}: {
  tenant: Tenant;
  plan: SubscriptionEmailPlan | null;
  amount: number;
  dueDate: Date;
  isKenya?: boolean;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    // Determine pricing for Kenya vs others
    const currency = isKenya ? 'KES' : 'USD';
    const currencySymbol = isKenya ? 'Ksh' : '$';
    const finalAmount = amount;
    const paymentUrl = getTenantPaymentUrl(tenant);

    // Build store URL
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.${baseDomain}`;

    const formattedAmount = currencySymbol === 'Ksh' 
      ? `Ksh ${Number(finalAmount).toLocaleString('en-KE')}`
      : `${currencySymbol}${Number(finalAmount).toFixed(2)}`;

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

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Store Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Store Name:</td>
                <td style="padding: 6px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Store URL:</td>
                <td style="padding: 6px 0;"><a href="${storeUrl}" style="color: #2563eb; text-decoration: none;">${storeUrl}</a></td>
              </tr>
            </table>
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
                <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #2563eb;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Currency:</td>
                <td style="padding: 8px 0;">${currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
                <td style="padding: 8px 0;">${dueDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${paymentUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Make Payment
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated reminder from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0;">Please make payment to avoid service interruption.</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Payment Due Reminder - ${formattedAmount} - ${tenant.name}`,
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
  proratedAmount,
  isKenya = false,
}: {
  tenant: Tenant;
  oldPlan: Pick<SubscriptionEmailPlan, 'name' | 'price' | 'price_kes'> | null;
  newPlan: SubscriptionEmailPlan | null;
  expireDate: Date;
  proratedAmount?: number;
  isKenya?: boolean;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    // Determine pricing for Kenya vs others
    const currencySymbol = isKenya ? 'Ksh' : '$';
    const newPrice = newPlan 
      ? resolvePlanMonthlyPrice({ price: newPlan.price, price_kes: newPlan.price_kes }, isKenya)
      : 0;
    const formattedNewPrice = newPrice 
      ? (currencySymbol === 'Ksh' 
          ? `Ksh ${Number(newPrice).toLocaleString('en-KE')}`
          : `$${Number(newPrice).toFixed(2)}`)
      : '$0.00';

    // Build store URL
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.${baseDomain}`;

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

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Store Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Store Name:</td>
                <td style="padding: 6px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Store URL:</td>
                <td style="padding: 6px 0;"><a href="${storeUrl}" style="color: #2563eb; text-decoration: none;">${storeUrl}</a></td>
              </tr>
            </table>
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
                <td style="padding: 8px 0;">${formattedNewPrice}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Expires:</td>
                <td style="padding: 8px 0;">${expireDate.toLocaleDateString()}</td>
              </tr>
              ${proratedAmount && proratedAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Prorated Charge:</td>
                <td style="padding: 8px 0;">${currencySymbol === 'Ksh' 
                    ? `Ksh ${Number(proratedAmount).toLocaleString('en-KE')}`
                    : `$${proratedAmount.toFixed(2)}`}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 8px 0; font-size: 12px; color: #6b7280;">
                  You've been charged a prorated amount for the remaining days in your billing cycle.
                </td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${storeUrl}/dashboard/subscription" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Subscription
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated confirmation from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0;">Thank you for upgrading!</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Plan Upgraded to ${newPlan?.name || 'New Plan'} - ${tenant.name}`,
      html,
    });
  } catch (error) {
    console.error('Error sending plan upgrade confirmation email:', error);
    throw error;
  }
}

/**
 * Send downgrade scheduled email
 */
export async function sendPlanDowngradeScheduledEmail({
  tenant,
  currentPlan,
  newPlan,
  effectiveDate,
  isKenya = false,
}: {
  tenant: Tenant;
  currentPlan: Pick<SubscriptionEmailPlan, 'name' | 'price' | 'price_kes'> | null;
  newPlan: SubscriptionEmailPlan | null;
  effectiveDate: Date;
  isKenya?: boolean;
}) {
  try {
    const tenantEmail = getTenantContactEmail(tenant);

    // Determine pricing for Kenya vs others
    const currencySymbol = isKenya ? 'Ksh' : '$';
    const newPrice = newPlan 
      ? resolvePlanMonthlyPrice({ price: newPlan.price, price_kes: newPlan.price_kes }, isKenya)
      : 0;
    const formattedNewPrice = newPrice 
      ? (currencySymbol === 'Ksh' 
          ? `Ksh ${Number(newPrice).toLocaleString('en-KE')}`
          : `$${Number(newPrice).toFixed(2)}`)
      : '$0.00';

    // Build store URL
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.${baseDomain}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Downgrade Scheduled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="margin: 0; color: #1f2937;">Plan Downgrade Scheduled</h1>
          </div>

          <p>Hello,</p>

          <p>Your plan downgrade has been scheduled and will take effect at the end of your current billing period.</p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Store Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Store Name:</td>
                <td style="padding: 6px 0;">${tenant.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Store URL:</td>
                <td style="padding: 6px 0;"><a href="${storeUrl}" style="color: #2563eb; text-decoration: none;">${storeUrl}</a></td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1f2937;">Downgrade Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Current Plan:</td>
                <td style="padding: 8px 0;">${currentPlan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">New Plan:</td>
                <td style="padding: 8px 0;">${newPlan?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Effective Date:</td>
                <td style="padding: 8px 0;">${effectiveDate.toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">New Price:</td>
                <td style="padding: 8px 0;">${formattedNewPrice}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Important:</strong> You will continue to have access to your current plan features until ${effectiveDate.toLocaleDateString()}. 
              No refunds will be issued for the current billing period.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${storeUrl}/dashboard/subscription" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Subscription
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p style="margin: 0;">This is an automated notification from DukaNest Platform</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Store: ${tenant.name} (${tenant.subdomain})</p>
          </div>
        </body>
      </html>
    `;

    return sendPlatformEmail({
      to: tenantEmail,
      subject: `Plan Downgrade Scheduled - ${tenant.name} - Effective ${effectiveDate.toLocaleDateString()}`,
      html,
    });
  } catch (error) {
    console.error('Error sending plan downgrade scheduled email:', error);
    throw error;
  }
}

