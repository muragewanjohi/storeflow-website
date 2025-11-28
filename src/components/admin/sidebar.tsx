/**
 * Admin Sidebar Component
 * 
 * Navigation sidebar for admin (landlord) pages
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type AuthUser } from '@/lib/auth/types';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  user: AuthUser;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  collapsed?: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Tenants', href: '/admin/tenants', icon: BuildingOfficeIcon },
  { name: 'Price Plans', href: '/admin/price-plans', icon: CreditCardIcon },
  { name: 'Support Tickets', href: '/admin/support/tickets', icon: ChatBubbleLeftRightIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function AdminSidebar({ 
  user, 
  mobileMenuOpen: externalMobileMenuOpen, 
  setMobileMenuOpen: externalSetMobileMenuOpen, 
  collapsed = false 
}: Readonly<SidebarProps>) {
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  const mobileMenuOpen = externalMobileMenuOpen ?? internalMobileMenuOpen;
  const setMobileMenuOpen = externalSetMobileMenuOpen ?? setInternalMobileMenuOpen;

  return (
    <>
      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-card px-6 pb-6 sm:max-w-sm sm:ring-1 sm:ring-border">
            <div className="flex h-16 shrink-0 items-center border-b">
              <Link href="/admin/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BuildingOfficeIcon className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold">StoreFlow Admin</span>
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
              <div className="mb-4 px-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Dashboard</p>
              </div>
              <ul role="list" className="space-y-1">
                {navigation.map((item: any) => {
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
            <Link href="/admin/dashboard" className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <BuildingOfficeIcon className="h-5 w-5" />
              </div>
              {!collapsed && <span className="text-lg font-semibold">StoreFlow Admin</span>}
            </Link>
          </div>
          <nav className="flex flex-1 flex-col px-3">
            {!collapsed && (
              <div className="mb-4 px-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Dashboard</p>
              </div>
            )}
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item: any) => {
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

