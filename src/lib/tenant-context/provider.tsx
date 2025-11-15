/**
 * Tenant Provider - React Context for Tenant Information
 * 
 * Provides tenant context to all client components
 * Automatically extracts tenant from headers set by middleware
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tenant } from '../tenant-context';

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant?: Tenant | null;
}

/**
 * TenantProvider - Provides tenant context to child components
 * 
 * @example
 * ```tsx
 * <TenantProvider>
 *   <App />
 * </TenantProvider>
 * ```
 */
export function TenantProvider({
  children,
  initialTenant,
}: Readonly<TenantProviderProps>) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant || null);
  const [isLoading, setIsLoading] = useState(!initialTenant);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If initial tenant provided, use it
    if (initialTenant) {
      setIsLoading(false);
      return;
    }

    // Otherwise, fetch tenant from API
    async function fetchTenant() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/tenant/current');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tenant');
        }

        const data = await response.json();
        setTenant(data.tenant);
        setError(null);
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenant();
  }, [initialTenant]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * useTenant - Hook to access tenant context
 * 
 * @returns Tenant context with tenant, isLoading, and error
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tenant, isLoading } = useTenant();
 *   
 *   if (isLoading) return <Loading />;
 *   if (!tenant) return <NotFound />;
 *   
 *   return <div>Welcome, {tenant.name}!</div>;
 * }
 * ```
 */
export function useTenant() {
  const context = useContext(TenantContext);
  
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  
  return context;
}

