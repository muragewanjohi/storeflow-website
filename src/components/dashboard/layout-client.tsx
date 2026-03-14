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
  EllipsisHorizontalCircleIcon,
  XMarkIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  FireIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  PaintBrushIcon,
  CreditCardIcon,
  UsersIcon,
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
import DashboardPwaControls from '@/components/pwa/dashboard-pwa-controls';

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
  const [mobileMoreMenuOpen, setMobileMoreMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const isDashboardHome = pathname === '/dashboard';
  const useImmersiveMobileShell =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/analytics') ||
    pathname.startsWith('/dashboard/orders') ||
    pathname.startsWith('/dashboard/products') ||
    pathname.startsWith('/dashboard/settings');
  const isMoreActive =
    pathname.startsWith('/dashboard/settings') ||
    pathname.startsWith('/dashboard/customers') ||
    pathname.startsWith('/dashboard/inventory') ||
    pathname.startsWith('/dashboard/categories') ||
    pathname.startsWith('/dashboard/sales') ||
    pathname.startsWith('/dashboard/media') ||
    pathname.startsWith('/dashboard/support') ||
    pathname.startsWith('/dashboard/themes') ||
    pathname.startsWith('/dashboard/subscription') ||
    pathname.startsWith('/dashboard/users');
  const mobileMoreLinks = [
    { href: '/dashboard/settings', label: 'Settings', icon: Cog6ToothIcon },
    { href: '/dashboard/customers', label: 'Customers', icon: UserGroupIcon },
    { href: '/dashboard/inventory', label: 'Inventory', icon: ClipboardDocumentListIcon },
    { href: '/dashboard/categories', label: 'Categories', icon: FolderIcon },
    { href: '/dashboard/settings/attributes', label: 'Attributes', icon: TagIcon },
    { href: '/dashboard/sales', label: 'Sales', icon: FireIcon },
    { href: '/dashboard/support/tickets', label: 'Support', icon: ChatBubbleLeftRightIcon },
    { href: '/dashboard/media', label: 'Media Library', icon: PhotoIcon },
    ...(user.role === 'tenant_admin'
      ? [
          { href: '/dashboard/themes', label: 'Themes', icon: PaintBrushIcon },
          { href: '/dashboard/users', label: 'Users', icon: UsersIcon },
          { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCardIcon },
        ]
      : []),
  ];

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
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMobileMoreMenuOpen(true);
              }}
              className={`flex w-[58px] flex-col items-center gap-1 ${
                isMoreActive ? 'text-primary' : 'text-[#6a7282]'
              }`}
            >
              <EllipsisHorizontalCircleIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">More</span>
            </Link>
          </div>
        </nav>

        {mobileMoreMenuOpen && (
          <div className="fixed inset-0 z-50 bg-white md:hidden">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <h2 className="text-lg font-semibold text-foreground">More</h2>
              <button
                type="button"
                onClick={() => setMobileMoreMenuOpen(false)}
                className="rounded-md p-2 text-[#6a7282] hover:bg-accent hover:text-foreground"
              >
                <span className="sr-only">Close more menu</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="px-4 pb-28 pt-4">
              <div className="grid grid-cols-2 gap-3">
                {mobileMoreLinks.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMoreMenuOpen(false)}
                      className={`rounded-xl border p-4 ${
                        isActive
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-[#e5e7eb] bg-white text-[#374151]'
                      }`}
                    >
                      <item.icon className="mb-2 h-6 w-6" />
                      <p className="text-sm font-medium">{item.label}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <DashboardPwaControls />
      </div>
    </CurrencyProvider>
  );
}

