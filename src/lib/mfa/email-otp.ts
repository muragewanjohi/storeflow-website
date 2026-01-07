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
/**
 * Ensure the mfa_otp_codes table exists
 */
async function ensureOTPTableExists(): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS mfa_otp_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, code, created_at)
      );
      
      CREATE INDEX IF NOT EXISTS idx_mfa_otp_user_id ON mfa_otp_codes(user_id);
      CREATE INDEX IF NOT EXISTS idx_mfa_otp_expires_at ON mfa_otp_codes(expires_at);
      CREATE INDEX IF NOT EXISTS idx_mfa_otp_used ON mfa_otp_codes(used);
    `;
  } catch (error: any) {
    // If table already exists or creation fails, log but don't throw
    // The INSERT will fail with a more specific error if table doesn't exist
    console.warn('Could not ensure mfa_otp_codes table exists:', error.message);
  }
}

export async function storeOTP(
  userId: string,
  email: string,
  otp: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  try {
    // Ensure table exists before inserting
    await ensureOTPTableExists();
    
    // Store OTP in database using raw SQL
    await prisma.$executeRaw`
      INSERT INTO mfa_otp_codes (user_id, email, code, expires_at, used)
      VALUES (${userId}::uuid, ${email}, ${otp}, ${expiresAt}, FALSE)
      ON CONFLICT DO NOTHING
    `;
  } catch (error: any) {
    console.error('Failed to store OTP in database:', error);
    // Re-throw with a more descriptive error
    throw new Error(`Failed to store OTP: ${error.message || 'Database error'}`);
  }
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

  const emailResult = await sendEmail({
    to,
    subject: `Your Login Code - ${otp}`,
    html,
    text,
  });

  // Check if email sending failed
  if (!emailResult.success) {
    throw new Error(emailResult.error || 'Failed to send email');
  }
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
  // Trim and normalize the code (remove any whitespace)
  const normalizedCode = code.trim();
  
  console.log('[verifyOTP] Starting verification', {
    userId,
    code: normalizedCode,
    codeLength: normalizedCode.length,
    codeType: typeof normalizedCode,
  });

  try {
    // First, check if a matching OTP exists (for debugging)
    const checkResult = await prisma.$queryRaw<Array<{
      id: string;
      code: string;
      used: boolean;
      expires_at: Date;
      created_at: Date;
    }>>`
      SELECT id, code, used, expires_at, created_at
      FROM mfa_otp_codes
      WHERE user_id = ${userId}::uuid
        AND code = ${normalizedCode}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('[verifyOTP] Found matching OTP records', {
      count: checkResult.length,
      records: checkResult.map(r => ({
        id: r.id,
        code: r.code,
        used: r.used,
        expires_at: r.expires_at,
        isExpired: new Date(r.expires_at) < new Date(),
      })),
    });

    // Find and verify the OTP (only update if not used and not expired)
    let result = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE mfa_otp_codes
      SET used = TRUE
      WHERE user_id = ${userId}::uuid
        AND code = ${normalizedCode}
        AND used = FALSE
        AND expires_at > NOW()
      RETURNING id
    `;

    console.log('[verifyOTP] Update result', {
      updated: result.length,
      success: result.length > 0,
    });

    // If code was not found as unused, check if it was used very recently
    // This handles cases where verification succeeded but session creation failed
    if (result.length === 0 && checkResult.length > 0) {
      const latest = checkResult[0];
      const isExpired = new Date(latest.expires_at) < new Date();
      const now = new Date();
      const codeAge = now.getTime() - new Date(latest.created_at).getTime();
      const recentlyUsed = latest.used && codeAge < 60000; // Used within last 60 seconds
      
      console.warn('[verifyOTP] Primary verification failed', {
        reason: latest.used ? 'already_used' : isExpired ? 'expired' : 'unknown',
        used: latest.used,
        isExpired,
        recentlyUsed,
        codeAge: codeAge / 1000, // in seconds
        expires_at: latest.expires_at,
        created_at: latest.created_at,
        now: now,
      });

      // If code was used very recently and not expired, allow it (session creation might have failed)
      if (recentlyUsed && !isExpired) {
        console.log('[verifyOTP] Allowing recently used code (within 60 seconds)');
        // Don't update again, just return true
        return true;
      }

      // Check if there are any unused, non-expired codes for this user
      const unusedCodes = await prisma.$queryRaw<Array<{
        code: string;
        expires_at: Date;
        created_at: Date;
      }>>`
        SELECT code, expires_at, created_at
        FROM mfa_otp_codes
        WHERE user_id = ${userId}::uuid
          AND used = FALSE
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      console.log('[verifyOTP] Available unused codes for user', {
        count: unusedCodes.length,
        codes: unusedCodes.map(c => ({
          code: c.code,
          expires_at: c.expires_at,
        })),
      });
    }

    return result.length > 0;
  } catch (error: any) {
    console.error('[verifyOTP] Error during verification', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
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
