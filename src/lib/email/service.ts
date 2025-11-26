/**
 * Unified Email Service
 * 
 * Centralized email service that handles all email sending with consistent configuration.
 * All email functions should use this service instead of calling sendEmail directly.
 * 
 * Features:
 * - Always uses verified sender email (SendGrid requirement)
 * - Consistent sender name formatting
 * - Automatic fallback handling
 * - Tenant-aware email configuration
 */

import { sendEmail } from './sendgrid';
import type { Tenant } from '@/lib/tenant-context';
import { getTenantContactEmail } from '@/lib/orders/emails';

export interface UnifiedEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tenant?: Tenant;
  fromName?: string;
  replyTo?: string;
}

/**
 * Get verified sender email address for SendGrid
 * Always returns a verified sender address (noreply@dukanest.com)
 * This is used for the 'from' field in emails
 */
function getVerifiedSenderEmail(): string {
  return process.env.SENDGRID_FROM_EMAIL || 'noreply@dukanest.com';
}

/**
 * Get sender name for emails
 * Uses tenant name if provided, otherwise uses default
 */
function getSenderName(tenant?: Tenant, customName?: string): string {
  if (customName) {
    return customName;
  }
  
  if (tenant) {
    if (tenant.name && tenant.name.trim()) {
      return tenant.name;
    }
    // Fallback: format subdomain as store name (e.g., "teststore" -> "Test Store")
    if (tenant.subdomain) {
      return tenant.subdomain
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  
  return process.env.SENDGRID_FROM_NAME || 'StoreFlow';
}

/**
 * Unified Email Service
 * 
 * Sends emails with consistent configuration:
 * - Always uses verified sender email (SendGrid requirement)
 * - Uses tenant name for sender name (if tenant provided)
 * - Sets reply-to to tenant contact email (if tenant provided)
 * 
 * @param options - Email options
 * @returns Promise with send result
 */
export async function sendUnifiedEmail(options: UnifiedEmailOptions) {
  const {
    to,
    subject,
    html,
    text,
    tenant,
    fromName,
    replyTo,
  } = options;

  // Always use verified sender email for 'from' field (SendGrid requirement)
  const fromEmail = getVerifiedSenderEmail();
  
  // Determine sender name
  const senderName = getSenderName(tenant, fromName);
  
  // Set reply-to to tenant contact email if tenant provided
  const replyToEmail = replyTo || (tenant ? getTenantContactEmail(tenant) : undefined);

  return sendEmail({
    to,
    from: fromEmail, // Always use verified sender
    fromName: senderName,
    subject,
    html,
    text,
    replyTo: replyToEmail, // Add reply-to for better email handling
  });
}

/**
 * Send email to customer
 * Convenience function for customer-facing emails
 */
export async function sendCustomerEmail({
  to,
  subject,
  html,
  text,
  tenant,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tenant: Tenant;
  replyTo?: string;
}) {
  return sendUnifiedEmail({
    to,
    subject,
    html,
    text,
    tenant,
    replyTo,
  });
}

/**
 * Send email to tenant admin
 * Convenience function for admin-facing emails
 */
export async function sendAdminEmail({
  to,
  subject,
  html,
  text,
  tenant,
  fromName,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tenant?: Tenant;
  fromName?: string;
  replyTo?: string;
}) {
  return sendUnifiedEmail({
    to,
    subject,
    html,
    text,
    tenant,
    fromName,
    replyTo,
  });
}

/**
 * Send platform email (from StoreFlow platform, not tenant)
 * For system-level emails like subscription notifications
 */
export async function sendPlatformEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  return sendUnifiedEmail({
    to,
    subject,
    html,
    text,
    fromName: 'StoreFlow Platform',
  });
}

