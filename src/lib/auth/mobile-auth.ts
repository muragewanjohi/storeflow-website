import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';
import type { AuthUser, UserRole } from '@/lib/auth/types';

function getSupabaseMobileClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for mobile authentication');
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

async function mapSupabaseUserToAuthUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<AuthUser | null> {
  if (!user.email) return null;

  const roleFromMetadata = user.user_metadata?.role;
  const role = (typeof roleFromMetadata === 'string' ? roleFromMetadata : 'customer') as UserRole;

  let tenantId =
    typeof user.user_metadata?.tenant_id === 'string' ? user.user_metadata.tenant_id : undefined;

  if (!tenantId && (role === 'tenant_admin' || role === 'tenant_staff')) {
    const ownedTenant = await prisma.tenants.findFirst({
      where: {
        user_id: user.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    tenantId = ownedTenant?.id;
  }

  return {
    id: user.id,
    email: user.email,
    role,
    tenant_id: tenantId,
    metadata: (user.user_metadata ?? {}) as AuthUser['metadata'],
  };
}

export async function authenticateMobileRequest(request: Request): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  const supabase = getSupabaseMobileClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return mapSupabaseUserToAuthUser(user);
}

export async function requireMobileAuth(request: Request): Promise<AuthUser> {
  const user = await authenticateMobileRequest(request);
  if (!user) {
    throw new Error('Unauthorized mobile request');
  }
  return user;
}

