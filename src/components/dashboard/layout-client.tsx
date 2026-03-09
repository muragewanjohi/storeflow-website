/**
 * Dashboard Layout Client Component
 * 
 * Client-side wrapper for dashboard layout with mobile menu state
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  ShoppingCartIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
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
  const pathname = usePathname();
  const isDashboardHome = pathname === '/dashboard';
  const useImmersiveMobileShell =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/analytics') ||
    pathname.startsWith('/dashboard/orders') ||
    pathname.startsWith('/dashboard/products') ||
    pathname.startsWith('/dashboard/settings');

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
          <div className={useImmersiveMobileShell ? 'hidden md:block' : ''}>
            <DashboardHeader 
              user={user} 
              tenant={tenant} 
              onMobileMenuClick={() => setMobileMenuOpen(true)}
              onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              sidebarCollapsed={sidebarCollapsed}
            />
          </div>
          <main className={useImmersiveMobileShell ? 'py-0 md:py-6' : 'py-6'}>
            <div className={useImmersiveMobileShell ? 'md:mx-auto md:max-w-7xl md:px-6 lg:px-8' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'}>
              <div className={useImmersiveMobileShell ? 'hidden md:block' : ''}>
                <AccessRestrictionBanner restriction={accessRestriction} />
                <UpdateNotificationBanner />
                <CompleteProfilePrompt
                  openByDefault={shouldShowProfilePrompt}
                  initialName={profileName}
                />
              </div>
              {children}
            </div>
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d1d5dc] bg-white md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <Link
              href="/dashboard"
              className={`flex w-[58px] flex-col items-center gap-1 ${
                pathname === '/dashboard' ? 'text-primary' : 'text-[#6a7282]'
              }`}
            >
              <HomeIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">Home</span>
            </Link>
            <Link
              href="/dashboard/orders"
              className={`flex w-[58px] flex-col items-center gap-1 ${
                pathname.startsWith('/dashboard/orders') ? 'text-primary' : 'text-[#6a7282]'
              }`}
            >
              <ShoppingCartIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">Orders</span>
            </Link>
            <Link
              href="/dashboard/products"
              className={`flex w-[58px] flex-col items-center gap-1 ${
                pathname.startsWith('/dashboard/products') ? 'text-primary' : 'text-[#6a7282]'
              }`}
            >
              <CubeIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">Products</span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className={`flex w-[58px] flex-col items-center gap-1 ${
                pathname.startsWith('/dashboard/analytics') ? 'text-primary' : 'text-[#6a7282]'
              }`}
            >
              <ChartBarIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">Analytics</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className={`flex w-[58px] flex-col items-center gap-1 ${
                pathname.startsWith('/dashboard/settings') ? 'text-primary' : 'text-[#6a7282]'
              }`}
            >
              <Cog6ToothIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">Settings</span>
            </Link>
          </div>
        </nav>
      </div>
    </CurrencyProvider>
  );
}

