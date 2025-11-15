/**
 * Supabase Admin Client
 * 
 * Creates a Supabase client with service role key for admin operations.
 * This client bypasses RLS and has access to admin methods.
 * 
 * ⚠️ WARNING: Only use this for server-side admin operations!
 * Never expose the service role key to the client.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create Supabase admin client with service role key
 * 
 * This client has full access to all admin methods and bypasses RLS.
 * Use only in API routes and server-side code.
 * 
 * @returns Supabase client with admin privileges
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

