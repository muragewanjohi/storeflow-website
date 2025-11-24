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
  FolderIcon,
  ShoppingCartIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Squares2X2Icon,
  TagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  user: AuthUser;
  tenant: Tenant;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  collapsed?: boolean;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  group?: string;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  // Catalog group
  { name: 'Products', href: '/dashboard/products', icon: CubeIcon, group: 'Catalog' },
  { name: 'Categories', href: '/dashboard/categories', icon: FolderIcon, group: 'Catalog' },
  { name: 'Attributes', href: '/dashboard/settings/attributes', icon: TagIcon, group: 'Catalog' },
  // Other items
  { name: 'Inventory', href: '/dashboard/inventory', icon: ClipboardDocumentListIcon },
  { name: 'Inventory Settings', href: '/dashboard/inventory/settings', icon: AdjustmentsHorizontalIcon, adminOnly: true },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCartIcon },
  { name: 'Customers', href: '/dashboard/customers', icon: UserGroupIcon },
  { name: 'Support Tickets', href: '/dashboard/support/tickets', icon: ChatBubbleLeftRightIcon, group: 'Support' },
  { name: 'Platform Support', href: '/dashboard/support/landlord-tickets', icon: ChatBubbleLeftRightIcon, group: 'Support' },
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon, adminOnly: true },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

// Catalog icon
const CatalogIcon = Squares2X2Icon;

export default function DashboardSidebar({ user, tenant, mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: externalSetMobileMenuOpen, collapsed = false }: Readonly<SidebarProps>) {
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const [catalogExpanded, setCatalogExpanded] = useState(true);
  const [supportExpanded, setSupportExpanded] = useState(true);
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

  // Group navigation items, ensuring Dashboard is first, then Catalog, then Support, then others
  const dashboardItem = filteredNavigation.find((item) => item.name === 'Dashboard');
  const catalogItems = filteredNavigation.filter((item) => item.group === 'Catalog');
  const supportItems = filteredNavigation.filter((item) => item.group === 'Support');
  const mainItems = filteredNavigation.filter((item) => !item.group && item.name !== 'Dashboard');
  
  // Build grouped navigation in the correct order using an array to maintain sequence
  const orderedGroupedNavigation: Array<{ groupName: string; items: NavigationItem[] }> = [];
  
  // First: Dashboard (Main group)
  if (dashboardItem) {
    orderedGroupedNavigation.push({ groupName: 'Main', items: [dashboardItem] });
  }
  
  // Second: Catalog group
  if (catalogItems.length > 0) {
    orderedGroupedNavigation.push({ groupName: 'Catalog', items: catalogItems });
  }
  
  // Third: Support group
  if (supportItems.length > 0) {
    orderedGroupedNavigation.push({ groupName: 'Support', items: supportItems });
  }
  
  // Fourth: Other main items (add to existing Main group or create new)
  if (mainItems.length > 0) {
    const mainGroupIndex = orderedGroupedNavigation.findIndex((g) => g.groupName === 'Main');
    if (mainGroupIndex !== -1) {
      orderedGroupedNavigation[mainGroupIndex].items.push(...mainItems);
    } else {
      orderedGroupedNavigation.push({ groupName: 'Main', items: mainItems });
    }
  }

  // Check if any catalog item is active
  const isCatalogActive = filteredNavigation.some(
    (item) => item.group === 'Catalog' && (pathname === item.href || pathname.startsWith(item.href + '/'))
  );

  // Check if any support item is active
  const isSupportActive = filteredNavigation.some(
    (item) => item.group === 'Support' && (pathname === item.href || pathname.startsWith(item.href + '/'))
  );

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
              <ul role="list" className="space-y-6">
                {orderedGroupedNavigation.map(({ groupName, items }) => {
                  const isCatalogGroup = groupName === 'Catalog';
                  const isSupportGroup = groupName === 'Support';
                  const isExpanded = isCatalogGroup ? catalogExpanded : (isSupportGroup ? supportExpanded : true);
                  const isMainGroup = groupName === 'Main';
                  
                  return (
                    <li key={groupName}>
                      {!isMainGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isCatalogGroup) {
                              setCatalogExpanded(!catalogExpanded);
                            } else if (isSupportGroup) {
                              setSupportExpanded(!supportExpanded);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${
                            (isCatalogGroup && isCatalogActive) || (isSupportGroup && isSupportActive) ? 'text-foreground' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCatalogGroup && (
                              <CatalogIcon className="h-4 w-4" />
                            )}
                            {isSupportGroup && (
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            )}
                            <span>{groupName}</span>
                          </div>
                          {(isCatalogGroup || isSupportGroup) && (
                            <ChevronDownIcon
                              className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                            />
                          )}
                        </button>
                      )}
                      {isExpanded && (
                        <ul role="list" className="space-y-1">
                          {items.map((item) => {
                            // Dashboard should only be active when pathname is exactly /dashboard
                            const isActive = item.name === 'Dashboard' 
                              ? pathname === item.href
                              : pathname === item.href || pathname.startsWith(item.href + '/');
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
                      )}
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
            <ul role="list" className="flex flex-1 flex-col gap-y-4">
              {orderedGroupedNavigation.map(({ groupName, items }) => {
                const isCatalogGroup = groupName === 'Catalog';
                const isSupportGroup = groupName === 'Support';
                const isExpanded = isCatalogGroup ? catalogExpanded : (isSupportGroup ? supportExpanded : true);
                const isMainGroup = groupName === 'Main';
                
                return (
                  <li key={groupName}>
                    {!collapsed && !isMainGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isCatalogGroup) {
                            setCatalogExpanded(!catalogExpanded);
                          } else if (isSupportGroup) {
                            setSupportExpanded(!supportExpanded);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${
                          (isCatalogGroup && isCatalogActive) || (isSupportGroup && isSupportActive) ? 'text-foreground' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCatalogGroup && (
                            <CatalogIcon className="h-4 w-4" />
                          )}
                          {isSupportGroup && (
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          )}
                          <span>{groupName}</span>
                        </div>
                        {(isCatalogGroup || isSupportGroup) && (
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                          />
                        )}
                      </button>
                    )}
                    {isExpanded && (
                      <ul role="list" className="flex flex-col gap-y-1">
                        {items.map((item) => {
                          // Dashboard should only be active when pathname is exactly /dashboard
                          const isActive = item.name === 'Dashboard' 
                            ? pathname === item.href
                            : pathname === item.href || pathname.startsWith(item.href + '/');
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
                    )}
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
