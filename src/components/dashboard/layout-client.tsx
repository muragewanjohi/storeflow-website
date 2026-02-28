/**
 * Dashboard Layout Client Component
 * 
 * Client-side wrapper for dashboard layout with mobile menu state
 */

'use client';

import { useState } from 'react';
import { type Tenant } from '@/lib/tenant-context';
import { type AuthUser } from '@/lib/auth/types';
import type { TenantAccessRestriction } from '@/lib/tenant-context/access-control';
import DashboardSidebar from './sidebar';
import DashboardHeader from './header';
import { AccessRestrictionBanner } from './access-restriction-banner';
import { UpdateNotificationBanner } from './update-notification-banner';
import { CurrencyProvider } from '@/lib/currency/currency-context';
import CompleteProfilePrompt from './complete-profile-prompt';

interface LayoutClientProps {
  user: AuthUser;
  tenant: Tenant;
  accessRestriction: TenantAccessRestriction;
  shouldShowProfilePrompt: boolean;
  profileName?: string;
  children: React.ReactNode;
}

export default function DashboardLayoutClient({ 
  user, 
  tenant, 
  accessRestriction,
  shouldShowProfilePrompt,
  profileName,
  children 
}: Readonly<LayoutClientProps>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <CurrencyProvider>
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
              <AccessRestrictionBanner restriction={accessRestriction} />
              <UpdateNotificationBanner />
              <CompleteProfilePrompt
                openByDefault={shouldShowProfilePrompt}
                initialName={profileName}
              />
              {children}
            </div>
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}

