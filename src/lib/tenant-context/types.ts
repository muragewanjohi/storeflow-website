/**
 * Tenant Type Definitions
 */

export interface Tenant {
  id: string;
  subdomain: string;
  custom_domain?: string | null;
  name: string;
  status: string;
  plan_id?: string | null;
  expire_date?: Date | null;
  start_date?: Date | null;
  renew_status?: string | null;
  theme_slug?: string | null;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface TenantContext {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

