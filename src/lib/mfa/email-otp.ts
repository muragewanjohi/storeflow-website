/**
 * Email-based 2FA OTP Management
 * 
 * Generates, stores, and verifies email OTP codes for 2FA
 */

import { prisma } from '@/lib/prisma/client';
import { sendEmail } from '@/lib/email/sendgrid';

const OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes

/**
 * Generate a random 6-digit OTP code
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP code in database for verification
 */
export async function storeOTP(
  userId: string,
  email: string,
  otp: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP in database using raw SQL (since Prisma schema might not have this table yet)
  await prisma.$executeRaw`
    INSERT INTO mfa_otp_codes (user_id, email, code, expires_at, used)
    VALUES (${userId}::uuid, ${email}, ${otp}, ${expiresAt}, FALSE)
    ON CONFLICT DO NOTHING
  `;
}

/**
 * Send OTP code via email
 */
export async function sendOTPEmail(
  to: string,
  otp: string,
  tenantName?: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Login Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Your Login Code</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hello,</p>
          
          <p>You're trying to log in to your ${tenantName ? tenantName + ' ' : ''}admin dashboard. Use this code to complete your login:</p>
          
          <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #667eea;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</strong>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            If you didn't request this code, please ignore this email or contact support if you're concerned.
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The Dukanest Team
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Your Login Code

Hello,

You're trying to log in to your ${tenantName ? tenantName + ' ' : ''}admin dashboard. Use this code to complete your login:

${otp}

This code will expire in ${OTP_EXPIRY_MINUTES} minutes.

If you didn't request this code, please ignore this email or contact support if you're concerned.

Best regards,
The Dukanest Team
  `;

  await sendEmail({
    to,
    subject: `Your Login Code - ${otp}`,
    html,
    text,
  });
}

/**
 * Generate and send OTP code
 */
export async function generateAndSendOTP(
  userId: string,
  email: string,
  tenantName?: string
): Promise<string> {
  const otp = generateOTP();
  
  // Store OTP in database
  await storeOTP(userId, email, otp);
  
  // Send email
  await sendOTPEmail(email, otp, tenantName);
  
  return otp;
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  userId: string,
  code: string
): Promise<boolean> {
  // Find and verify the OTP
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE mfa_otp_codes
    SET used = TRUE
    WHERE user_id = ${userId}::uuid
      AND code = ${code}
      AND used = FALSE
      AND expires_at > NOW()
    RETURNING id
  `;

  return result.length > 0;
}

/**
 * Clean up expired OTPs (call periodically)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM mfa_otp_codes
    WHERE expires_at < NOW()
       OR (created_at < NOW() - INTERVAL '1 hour' AND used = TRUE)
  `;
}
