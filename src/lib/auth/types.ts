/**
 * Authentication Types
 */

export type UserRole = 'landlord' | 'tenant_admin' | 'tenant_staff' | 'customer';

export interface UserMetadata {
  role: UserRole;
  tenant_id?: string;
  permissions?: string[];
  name?: string;
  full_name?: string;
  profile_completed?: boolean;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenant_id?: string;
  metadata?: UserMetadata;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

