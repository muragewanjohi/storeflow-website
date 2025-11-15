/**
 * Dashboard Layout Client Component
 * 
 * Client-side wrapper for dashboard layout with mobile menu state
 */

'use client';

import { useState } from 'react';
import { type Tenant } from '@/lib/tenant-context';
import { type AuthUser } from '@/lib/auth/types';
import DashboardSidebar from './sidebar';
import DashboardHeader from './header';

interface LayoutClientProps {
  user: AuthUser;
  tenant: Tenant;
  children: React.ReactNode;
}

export default function DashboardLayoutClient({ user, tenant, children }: Readonly<LayoutClientProps>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar 
        user={user} 
        tenant={tenant} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div className={sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}>
        <DashboardHeader 
          user={user} 
          tenant={tenant} 
          onMobileMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

