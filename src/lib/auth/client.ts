/**
 * Client-Side Authentication Utilities
 * 
 * Hooks and utilities for client components
 */

'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { AuthUser } from './types';

/**
 * Get current user (client-side)
 * 
 * @returns User object or null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      role: (user.user_metadata?.role as any) || 'customer',
      tenant_id: user.user_metadata?.tenant_id,
      metadata: user.user_metadata as any,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Hook to get current user
 * 
 * @returns { user, isLoading, error }
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: (session.user.user_metadata?.role as any) || 'customer',
            tenant_id: session.user.user_metadata?.tenant_id,
            metadata: session.user.user_metadata as any,
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading, error };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

