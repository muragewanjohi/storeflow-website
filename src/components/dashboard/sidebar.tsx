/**
 * Dashboard Sidebar Component
 * 
 * Navigation sidebar for dashboard pages
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type Tenant } from '@/lib/tenant-context';
import { type AuthUser } from '@/lib/auth/types';
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  user: AuthUser;
  tenant: Tenant;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  collapsed?: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Products', href: '/dashboard/products', icon: CubeIcon },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCartIcon },
  { name: 'Customers', href: '/dashboard/customers', icon: UserGroupIcon },
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon, adminOnly: true },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export default function DashboardSidebar({ user, tenant, mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: externalSetMobileMenuOpen, collapsed = false }: Readonly<SidebarProps>) {
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Use external state if provided, otherwise use internal state
  const mobileMenuOpen = externalMobileMenuOpen ?? internalMobileMenuOpen;
  const setMobileMenuOpen = externalSetMobileMenuOpen ?? setInternalMobileMenuOpen;

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (item.adminOnly && user.role !== 'tenant_admin') {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-card px-6 pb-6 sm:max-w-sm sm:ring-1 sm:ring-border">
            <div className="flex h-16 shrink-0 items-center border-b">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CubeIcon className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold">{tenant.name}</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 ml-auto p-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <nav className="mt-6">
              <div className="mb-4">
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Store Dashboard</p>
              </div>
              <ul role="list" className="space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card pb-4 transition-all duration-300">
          <div className={`flex h-16 shrink-0 items-center border-b px-6 ${collapsed ? 'justify-center' : ''}`}>
            <Link href="/dashboard" className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <CubeIcon className="h-5 w-5" />
              </div>
              {!collapsed && <span className="text-lg font-semibold">{tenant.name}</span>}
            </Link>
          </div>
          <nav className="flex flex-1 flex-col px-3">
            {!collapsed && (
              <div className="mb-4 px-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Store Dashboard</p>
              </div>
            )}
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`group flex gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                        }`}
                        aria-hidden="true"
                      />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
