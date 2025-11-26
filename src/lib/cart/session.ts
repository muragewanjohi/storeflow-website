/**
 * Cart Session Management
 * 
 * Handles session ID generation and storage for guest carts
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'cart_session_id';
const SESSION_DURATION_DAYS = 30; // Guest cart persists for 30 days

/**
 * Get or create session ID for guest cart
 * 
 * Returns session ID from cookie, or creates a new one
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    // Generate a new session ID
    sessionId = crypto.randomBytes(32).toString('hex');
    
    // Store in cookie
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
    
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
  }

  return sessionId;
}

/**
 * Get session ID if it exists (doesn't create new one)
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Clear session ID (on logout or cart merge)
 */
export async function clearSessionId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

