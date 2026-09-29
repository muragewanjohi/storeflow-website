import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { hashToken } from './validation';

export const VENDOR_SESSION_COOKIE = 'proximity_vendor_session';
export const VENDOR_SESSION_DAYS = 7;

export async function hashVendorPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function vendorPasswordMatches(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createVendorSessionToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + VENDOR_SESSION_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function generateVendorPassword(): string {
  return crypto.randomBytes(9).toString('base64url');
}

export function vendorSessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    expires,
    path: '/',
  };
}
