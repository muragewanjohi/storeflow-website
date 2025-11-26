/**
 * Notification Email Service
 * 
 * Handles sending email notifications to admin users
 * Implements best practices: digest emails, rate limiting, and user preferences
 */

import { sendAdminEmail } from '@/lib/email/service';
import type { Tenant } from '@/lib/tenant-context';
import type { Notification, NotificationType } from './types';
import { createAdminClient } from '@/lib/supabase/admin';

export interface NotificationEmailPreferences {
  immediate: NotificationType[]; // Types that should be sent immediately
  digest: NotificationType[]; // Types that should be batched in digest
  frequency: 'immediate' | 'hourly' | 'daily'; // Digest frequency
  enabled: boolean; // Master switch
}

/**
 * Default notification preferences
 * Critical events are sent immediately, others are batched
 */
const DEFAULT_PREFERENCES: NotificationEmailPreferences = {
  immediate: ['new_order', 'failed_payment'], // Critical events
  digest: ['pending_payment', 'low_stock'], // Less urgent events
  frequency: 'hourly', // Send digest every hour
  enabled: true,
};

/**
 * Get tenant admin email from Supabase Auth
 */
async function getTenantAdminEmail(tenant: Tenant): Promise<string | null> {
  if (!tenant.user_id) {
    return null;
  }

  try {
    const adminClient = createAdminClient();
    const { data: user, error } = await adminClient.auth.admin.getUserById(tenant.user_id);

    if (error || !user?.user?.email) {
      console.error('Error fetching tenant admin email:', error);
      return null;
    }

    return user.user.email;
  } catch (error) {
    console.error('Error getting tenant admin email:', error);
    return null;
  }
}

/**
 * Get tenant contact email address for notifications
 */
async function getTenantEmailAddress(tenant: Tenant): Promise<string> {
  // First, try to get the tenant admin's email
  const adminEmail = await getTenantAdminEmail(tenant);
  if (adminEmail) {
    return adminEmail;
  }

  // Fallback to noreply address if admin email is not available
  if (tenant.custom_domain) {
    return `noreply@${tenant.custom_domain}`;
  }
  return `noreply@${tenant.subdomain}.dukanest.com`;
}

/**
 * Rate limiting: Track last email sent per tenant to prevent spam
 */
const emailRateLimits = new Map<string, { lastImmediate: Date; lastDigest: Date }>();

/**
 * Minimum time between immediate emails (5 minutes)
 */
const IMMEDIATE_EMAIL_COOLDOWN = 5 * 60 * 1000;

/**
 * Minimum time between digest emails (based on frequency)
 */
const DIGEST_EMAIL_COOLDOWNS = {
  hourly: 60 * 60 * 1000, // 1 hour
  daily: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Check if we should send an immediate email (rate limiting)
 */
function shouldSendImmediate(tenantId: string): boolean {
  const limits = emailRateLimits.get(tenantId);
  if (!limits) return true;

  const timeSinceLastEmail = Date.now() - limits.lastImmediate.getTime();
  return timeSinceLastEmail >= IMMEDIATE_EMAIL_COOLDOWN;
}

/**
 * Check if we should send a digest email (rate limiting)
 */
function shouldSendDigest(
  tenantId: string,
  frequency: 'immediate' | 'hourly' | 'daily'
): boolean {
  if (frequency === 'immediate') return true;

  const limits = emailRateLimits.get(tenantId);
  if (!limits) return true;

  const cooldown = DIGEST_EMAIL_COOLDOWNS[frequency];
  const timeSinceLastDigest = Date.now() - limits.lastDigest.getTime();
  return timeSinceLastDigest >= cooldown;
}

/**
 * Update rate limit tracking
 */
function updateRateLimit(tenantId: string, type: 'immediate' | 'digest') {
  const limits = emailRateLimits.get(tenantId) || {
    lastImmediate: new Date(0),
    lastDigest: new Date(0),
  };

  if (type === 'immediate') {
    limits.lastImmediate = new Date();
  } else {
    limits.lastDigest = new Date();
  }

  emailRateLimits.set(tenantId, limits);
}

/**
 * Send immediate notification email for critical events
 */
export async function sendImmediateNotificationEmail({
  tenant,
  notification,
  preferences = DEFAULT_PREFERENCES,
}: {
  tenant: Tenant;
  notification: Notification;
  preferences?: NotificationEmailPreferences;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  // Check if email notifications are enabled
  if (!preferences.enabled) {
    return { success: true, skipped: true };
  }

  // Check if this notification type should be sent immediately
  if (!preferences.immediate.includes(notification.type)) {
    return { success: true, skipped: true };
  }

  // Rate limiting check
  if (!shouldSendImmediate(tenant.id)) {
    console.log(
      `Rate limit: Skipping immediate email for tenant ${tenant.id} (too soon after last email)`
    );
    return { success: true, skipped: true };
  }

  const tenantEmail = await getTenantEmailAddress(tenant);
  const dashboardUrl = `https://${tenant.subdomain}.dukanest.com/dashboard`;

  const subject = getNotificationSubject(notification);
  const html = generateImmediateNotificationEmail(notification, tenant, dashboardUrl);

  // Use unified email service - automatically handles verified sender
  const result = await sendAdminEmail({
    to: tenantEmail,
    subject,
    html,
    tenant,
  });

  if (result.success) {
    updateRateLimit(tenant.id, 'immediate');
  }

  return result;
}

/**
 * Send digest email with batched notifications
 */
export async function sendNotificationDigestEmail({
  tenant,
  notifications,
  preferences = DEFAULT_PREFERENCES,
}: {
  tenant: Tenant;
  notifications: Notification[];
  preferences?: NotificationEmailPreferences;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  // Check if email notifications are enabled
  if (!preferences.enabled) {
    return { success: true, skipped: true };
  }

  // Filter notifications that should be in digest
  const digestNotifications = notifications.filter((n) =>
    preferences.digest.includes(n.type)
  );

  if (digestNotifications.length === 0) {
    return { success: true, skipped: true };
  }

  // Rate limiting check
  if (!shouldSendDigest(tenant.id, preferences.frequency)) {
    return { success: true, skipped: true };
  }

  const tenantEmail = await getTenantEmailAddress(tenant);
  const dashboardUrl = `https://${tenant.subdomain}.dukanest.com/dashboard`;

  const html = generateDigestEmail(digestNotifications, tenant, dashboardUrl);
  const subject = `Daily Digest - ${digestNotifications.length} Notification${digestNotifications.length > 1 ? 's' : ''}`;

  // Use unified email service - automatically handles verified sender
  const result = await sendAdminEmail({
    to: tenantEmail,
    subject,
    html,
    tenant,
  });

  if (result.success) {
    updateRateLimit(tenant.id, 'digest');
  }

  return result;
}

/**
 * Get email subject line for notification
 */
function getNotificationSubject(notification: Notification): string {
  switch (notification.type) {
    case 'new_order':
      return `New Order: ${notification.metadata?.order_number || 'Order Received'}`;
    case 'failed_payment':
      return `Payment Failed: Order ${notification.metadata?.order_number || ''}`;
    case 'pending_payment':
      return `Pending Payment: Order ${notification.metadata?.order_number || ''}`;
    case 'low_stock':
      return `Low Stock Alert: ${notification.message}`;
    default:
      return notification.title;
  }
}

/**
 * Generate HTML for immediate notification email
 */
function generateImmediateNotificationEmail(
  notification: Notification,
  tenant: Tenant,
  dashboardUrl: string
): string {
  const notificationColor = getNotificationColor(notification.type);
  const notificationIcon = getNotificationIcon(notification.type);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${notificationColor} 0%, ${notificationColor}dd 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${notificationIcon} ${notification.title}</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
          
          ${getNotificationDetails(notification)}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}${notification.link}" style="background: ${notificationColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Details
            </a>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #666;">
              You're receiving this email because you're an administrator of <strong>${tenant.name}</strong>.
              <br>
              <a href="${dashboardUrl}/settings" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for digest email
 */
function generateDigestEmail(
  notifications: Notification[],
  tenant: Tenant,
  dashboardUrl: string
): string {
  const groupedNotifications = groupNotificationsByType(notifications);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification Digest</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">📬 Notification Digest</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">${notifications.length} new notification${notifications.length > 1 ? 's' : ''}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          ${Object.entries(groupedNotifications)
            .map(
              ([type, items]) => `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${getNotificationColor(type as NotificationType)};">
              <h2 style="margin-top: 0; color: ${getNotificationColor(type as NotificationType)}; font-size: 18px;">
                ${getNotificationIcon(type as NotificationType)} ${getNotificationTypeLabel(type as NotificationType)} (${items.length})
              </h2>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${items
                  .slice(0, 5)
                  .map(
                    (item) => `
                  <li style="margin-bottom: 8px;">
                    <a href="${dashboardUrl}${item.link}" style="color: #667eea; text-decoration: none;">${item.message}</a>
                  </li>
                `
                  )
                  .join('')}
              </ul>
              ${items.length > 5 ? `<p style="color: #666; font-size: 14px; margin-top: 10px;">+ ${items.length - 5} more</p>` : ''}
            </div>
          `
            )
            .join('')}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View All Notifications
            </a>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #666;">
              You're receiving this digest because you're an administrator of <strong>${tenant.name}</strong>.
              <br>
              <a href="${dashboardUrl}/settings" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Group notifications by type
 */
function groupNotificationsByType(
  notifications: Notification[]
): Record<string, Notification[]> {
  return notifications.reduce((acc, notification) => {
    if (!acc[notification.type]) {
      acc[notification.type] = [];
    }
    acc[notification.type].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);
}

/**
 * Get notification color by type
 */
function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'new_order':
      return '#3b82f6'; // blue
    case 'pending_payment':
      return '#f59e0b'; // amber
    case 'failed_payment':
      return '#ef4444'; // red
    case 'low_stock':
      return '#f97316'; // orange
    default:
      return '#667eea';
  }
}

/**
 * Get notification icon by type
 */
function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'new_order':
      return '🛒';
    case 'pending_payment':
      return '⏳';
    case 'failed_payment':
      return '❌';
    case 'low_stock':
      return '⚠️';
    default:
      return '🔔';
  }
}

/**
 * Get notification type label
 */
function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'new_order':
      return 'New Orders';
    case 'pending_payment':
      return 'Pending Payments';
    case 'failed_payment':
      return 'Failed Payments';
    case 'low_stock':
      return 'Low Stock Alerts';
    default:
      return 'Notifications';
  }
}

/**
 * Get notification details HTML
 */
function getNotificationDetails(notification: Notification): string {
  if (notification.type === 'new_order' && notification.metadata) {
    return `
      <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Order Number:</strong> ${notification.metadata.order_number || 'N/A'}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Amount:</strong> $${notification.metadata.amount?.toFixed(2) || '0.00'}</p>
      </div>
    `;
  }

  if (notification.type === 'low_stock' && notification.metadata) {
    return `
      <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Stock Level:</strong> ${notification.metadata.stock_quantity || 0} units</p>
      </div>
    `;
  }

  return '';
}

