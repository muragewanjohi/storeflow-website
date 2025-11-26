/**
 * Customer Email Notifications
 * 
 * Email templates and functions for customer-related notifications
 */

import { sendCustomerEmail } from '@/lib/email/service';
import { getTenantContactEmail } from '@/lib/orders/emails';
import type { Tenant } from '@/lib/tenant-context';

interface Customer {
  id: string;
  name: string;
  email: string;
}

/**
 * Send welcome email to new customer
 */
export async function sendCustomerWelcomeEmail({
  customer,
  tenant,
  verificationToken,
}: {
  customer: Customer;
  tenant: Tenant;
  verificationToken: string;
}) {
  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const verificationUrl = `${storeUrl}/verify-email?token=${verificationToken}`;
  const tenantEmail = getTenantContactEmail(tenant);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${tenant.name}!</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to ${tenant.name}!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customer.name},</p>
          
          <p>Thank you for creating an account with <strong>${tenant.name}</strong>! We're excited to have you as part of our community.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Verify Your Email</h2>
            <p>Please verify your email address to complete your registration and unlock all features.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
          
          <p>Once verified, you'll be able to:</p>
          <ul>
            <li>Access your account dashboard</li>
            <li>View your order history</li>
            <li>Save shipping addresses</li>
            <li>Add items to your wishlist</li>
            <li>Track your orders</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${storeUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Start Shopping
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact us at <a href="mailto:${tenantEmail}">${tenantEmail}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The ${tenant.name} Team
          </p>
        </div>
      </body>
    </html>
  `;

  return sendCustomerEmail({
    to: customer.email,
    subject: `Welcome to ${tenant.name}!`,
    html,
    tenant,
  });
}

/**
 * Send password reset email to customer
 */
export async function sendCustomerPasswordResetEmail({
  customer,
  tenant,
  resetToken,
}: {
  customer: Customer;
  tenant: Tenant;
  resetToken: string;
}) {
  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const resetUrl = `${storeUrl}/reset-password?token=${resetToken}`;
  const tenantEmail = getTenantContactEmail(tenant);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customer.name},</p>
          
          <p>We received a request to reset your password for your account at <strong>${tenant.name}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h2 style="margin-top: 0; color: #ef4444;">Reset Your Password</h2>
            <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetUrl}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #ef4444; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact us at <a href="mailto:${tenantEmail}">${tenantEmail}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The ${tenant.name} Team
          </p>
        </div>
      </body>
    </html>
  `;

  return sendCustomerEmail({
    to: customer.email,
    subject: `Reset Your Password - ${tenant.name}`,
    html,
    tenant,
  });
}

/**
 * Send email verification email to customer
 */
export async function sendCustomerEmailVerificationEmail({
  customer,
  tenant,
  verificationToken,
}: {
  customer: Customer;
  tenant: Tenant;
  verificationToken: string;
}) {
  const storeUrl = `https://${tenant.subdomain}.dukanest.com`;
  const verificationUrl = `${storeUrl}/verify-email?token=${verificationToken}`;
  const tenantEmail = getTenantContactEmail(tenant);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello ${customer.name},</p>
          
          <p>Please verify your email address to complete your account setup at <strong>${tenant.name}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="margin-top: 0; color: #10b981;">Verify Email Address</h2>
            <p>Click the button below to verify your email address.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${verificationUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Verify Email
              </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact us at <a href="mailto:${tenantEmail}">${tenantEmail}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The ${tenant.name} Team
          </p>
        </div>
      </body>
    </html>
  `;

  return sendCustomerEmail({
    to: customer.email,
    subject: `Verify Your Email - ${tenant.name}`,
    html,
    tenant,
  });
}

