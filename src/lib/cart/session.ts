/**
 * Cart Session Management
 * 
 * Handles session ID generation and storage for guest carts
 * 
 * Uses session cookies (no expiration) so they clear when browser/incognito window closes.
 * This follows e-commerce best practices for guest cart privacy.
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'cart_session_id';

/**
 * Get or create session ID for guest cart
 * 
 * Returns session ID from cookie, or creates a new one.
 * Uses session cookie (no expiration) so it clears when browser closes.
 * This ensures cart items disappear in incognito mode when window closes.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    // Generate a new session ID
    sessionId = crypto.randomBytes(32).toString('hex');
    
    // Store as session cookie (no expiration) - clears when browser/incognito window closes
    // This follows best practices: guest carts should not persist across sessions
    // Users who want persistence should create an account
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // No 'expires' or 'maxAge' = session cookie (cleared when browser closes)
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

