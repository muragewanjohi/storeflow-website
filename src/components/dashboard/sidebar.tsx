/**
 * Dashboard Sidebar Component
 * 
 * Navigation sidebar for dashboard pages
 */

'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  CreditCardIcon,
  DocumentTextIcon,
  NewspaperIcon,
  PhotoIcon,
  ArrowTrendingUpIcon,
  PaintBrushIcon,
  FireIcon,
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
  submenu?: boolean; // Indicates this is a submenu item (indented under parent)
}

const navigation: NavigationItem[] = [
  // 1. Dashboard (Most important - always first)
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  
  // 2. Themes (Design and customization - important for branding)
  { name: 'Themes', href: '/dashboard/themes', icon: PaintBrushIcon, adminOnly: true },
  
  // 3. Orders (Second most important - revenue center)
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCartIcon },
  
  // 4. Products group (Catalog management)
  { name: 'Products', href: '/dashboard/products', icon: CubeIcon, group: 'Products' },
  { name: 'Categories', href: '/dashboard/categories', icon: FolderIcon, group: 'Products' },
  { name: 'Attributes', href: '/dashboard/settings/attributes', icon: TagIcon, group: 'Products' },
  { name: 'Inventory', href: '/dashboard/inventory', icon: ClipboardDocumentListIcon, group: 'Products' },
  { name: 'Inventory Settings', href: '/dashboard/inventory/settings', icon: AdjustmentsHorizontalIcon, group: 'Products', adminOnly: true },
  
  // 5. Customers (Standalone - important)
  { name: 'Customers', href: '/dashboard/customers', icon: UserGroupIcon },
  
  // 6. Marketing group (Sales, Promotions, Analytics)
  { name: 'Sales', href: '/dashboard/sales', icon: FireIcon, group: 'Marketing' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ArrowTrendingUpIcon, group: 'Marketing' },
  
  // 7. Content group (Website content)
  { name: 'Pages', href: '/dashboard/pages', icon: DocumentTextIcon, group: 'Content' },
  { name: 'Blogs', href: '/dashboard/blogs', icon: NewspaperIcon, group: 'Content' },
  { name: 'Blog Categories', href: '/dashboard/blogs/categories', icon: TagIcon, group: 'Content', submenu: true },
  { name: 'Forms', href: '/dashboard/forms', icon: ClipboardDocumentListIcon, group: 'Content' },
  { name: 'Media Library', href: '/dashboard/media', icon: PhotoIcon, group: 'Content' },
  
  // 8. Settings (Standalone)
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  
  // 9. Support group
  { name: 'Support Tickets', href: '/dashboard/support/tickets', icon: ChatBubbleLeftRightIcon, group: 'Support' },
  { name: 'Platform Support', href: '/dashboard/support/landlord-tickets', icon: ChatBubbleLeftRightIcon, group: 'Support' },
  
  // 10. Admin-only items
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon, adminOnly: true },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCardIcon, adminOnly: true },
];

// Catalog icon
const CatalogIcon = Squares2X2Icon;

export default function DashboardSidebar({ user, tenant, mobileMenuOpen: externalMobileMenuOpen, setMobileMenuOpen: externalSetMobileMenuOpen, collapsed = false }: Readonly<SidebarProps>) {
  const router = useRouter();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  // All groups closed by default (accordion behavior)
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [marketingExpanded, setMarketingExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [supportExpanded, setSupportExpanded] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  
  // Use external state if provided, otherwise use internal state
  const mobileMenuOpen = externalMobileMenuOpen ?? internalMobileMenuOpen;
  const setMobileMenuOpen = externalSetMobileMenuOpen ?? setInternalMobileMenuOpen;

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item: any) => {
    if (item.adminOnly && user.role !== 'tenant_admin') {
      return false;
    }
    return true;
  });

  // Group navigation items following e-commerce best practices:
  // 1. Dashboard (standalone)
  // 2. Themes (standalone - design and customization)
  // 3. Orders (standalone - most important after dashboard)
  // 4. Products group
  // 5. Customers (standalone)
  // 6. Marketing group
  // 7. Content group
  // 8. Settings (standalone)
  // 9. Support group
  // 10. Admin items (standalone)
  
  const dashboardItem = filteredNavigation.find((item) => item.name === 'Dashboard');
  const themesItem = filteredNavigation.find((item) => item.name === 'Themes');
  const ordersItem = filteredNavigation.find((item) => item.name === 'Orders');
  const customersItem = filteredNavigation.find((item) => item.name === 'Customers');
  const settingsItem = filteredNavigation.find((item) => item.name === 'Settings');
  const productsItems = filteredNavigation.filter((item: any) => item.group === 'Products');
  const marketingItems = filteredNavigation.filter((item: any) => item.group === 'Marketing');
  const contentItems = filteredNavigation.filter((item: any) => item.group === 'Content');
  const supportItems = filteredNavigation.filter((item: any) => item.group === 'Support');
  const adminItems = filteredNavigation.filter((item: any) => item.adminOnly && !item.group);
  
  // Build grouped navigation in the correct order using an array to maintain sequence
  const orderedGroupedNavigation: Array<{ groupName: string; items: NavigationItem[] }> = [];
  
  // 1. Dashboard (standalone)
  if (dashboardItem) {
    orderedGroupedNavigation.push({ groupName: 'Main', items: [dashboardItem] });
  }
  
  // 2. Themes (standalone - design and customization)
  if (themesItem) {
    orderedGroupedNavigation.push({ groupName: 'Main', items: [themesItem] });
  }
  
  // 3. Orders (standalone - most important)
  if (ordersItem) {
    orderedGroupedNavigation.push({ groupName: 'Main', items: [ordersItem] });
  }
  
  // 4. Products group
  if (productsItems.length > 0) {
    orderedGroupedNavigation.push({ groupName: 'Products', items: productsItems });
  }
  
  // 4. Customers (standalone)
  if (customersItem) {
    orderedGroupedNavigation.push({ groupName: 'Main', items: [customersItem] });
  }
  
  // 5. Marketing group
  if (marketingItems.length > 0) {
    orderedGroupedNavigation.push({ groupName: 'Marketing', items: marketingItems });
  }
  
  // 6. Content group
  if (contentItems.length > 0) {
    orderedGroupedNavigation.push({ groupName: 'Content', items: contentItems });
  }
  
  // 7. Settings (standalone)
  if (settingsItem) {
    orderedGroupedNavigation.push({ groupName: 'Main', items: [settingsItem] });
  }
  
  // 8. Support group
  if (supportItems.length > 0) {
    orderedGroupedNavigation.push({ groupName: 'Support', items: supportItems });
  }
  
  // 9. Admin items (standalone)
  if (adminItems.length > 0) {
    orderedGroupedNavigation.push({ groupName: 'Main', items: adminItems });
  }

  // Check if any products item is active
  const isProductsActive = filteredNavigation.some(
    (item) => item.group === 'Products' && (pathname === item.href || pathname.startsWith(item.href + '/'))
  );

  // Check if any marketing item is active
  const isMarketingActive = filteredNavigation.some(
    (item) => item.group === 'Marketing' && (pathname === item.href || pathname.startsWith(item.href + '/'))
  );

  // Check if any content item is active
  const isContentActive = filteredNavigation.some(
    (item) => item.group === 'Content' && (pathname === item.href || pathname.startsWith(item.href + '/'))
  );

  // Check if any support item is active
  const isSupportActive = filteredNavigation.some(
    (item) => item.group === 'Support' && (pathname === item.href || pathname.startsWith(item.href + '/'))
  );

  // Auto-expand active group on mount and when pathname changes
  useEffect(() => {
    if (isProductsActive) {
      setProductsExpanded(true);
      setMarketingExpanded(false);
      setContentExpanded(false);
      setSupportExpanded(false);
    } else if (isMarketingActive) {
      setProductsExpanded(false);
      setMarketingExpanded(true);
      setContentExpanded(false);
      setSupportExpanded(false);
    } else if (isContentActive) {
      setProductsExpanded(false);
      setMarketingExpanded(false);
      setContentExpanded(true);
      setSupportExpanded(false);
    } else if (isSupportActive) {
      setProductsExpanded(false);
      setMarketingExpanded(false);
      setContentExpanded(false);
      setSupportExpanded(true);
    }
    // Only run when pathname or active states change, not when expanded states change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isProductsActive, isMarketingActive, isContentActive, isSupportActive]);

  // Accordion handler - opens one group and closes others
  const handleGroupToggle = (groupName: string) => {
    const isCurrentlyExpanded = 
      (groupName === 'Products' && productsExpanded) ||
      (groupName === 'Marketing' && marketingExpanded) ||
      (groupName === 'Content' && contentExpanded) ||
      (groupName === 'Support' && supportExpanded);

    // If clicking an already expanded group, close it
    // Otherwise, close all and open the clicked one
    if (isCurrentlyExpanded) {
      // Close the group
      if (groupName === 'Products') setProductsExpanded(false);
      if (groupName === 'Marketing') setMarketingExpanded(false);
      if (groupName === 'Content') setContentExpanded(false);
      if (groupName === 'Support') setSupportExpanded(false);
    } else {
      // Close all groups first, then open the clicked one
      setProductsExpanded(false);
      setMarketingExpanded(false);
      setContentExpanded(false);
      setSupportExpanded(false);
      
      // Open the clicked group
      if (groupName === 'Products') setProductsExpanded(true);
      if (groupName === 'Marketing') setMarketingExpanded(true);
      if (groupName === 'Content') setContentExpanded(true);
      if (groupName === 'Support') setSupportExpanded(true);
    }
  };

  // Navigation handler with loading state
  const navigateWithLoading = (href: string) => {
    if (pathname === href) return;
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  // Clear pending state after transition settles
  useEffect(() => {
    if (!isPending) {
      setPendingHref(null);
    }
  }, [isPending]);

  return (
    <>
      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-card px-6 pb-6 sm:max-w-sm sm:ring-1 sm:ring-border">
            <div className="flex h-16 shrink-0 items-center border-b">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  navigateWithLoading('/dashboard');
                  setMobileMenuOpen(false);
                }}
                aria-busy={pendingHref === '/dashboard'}
              >
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
                  const isProductsGroup = groupName === 'Products';
                  const isMarketingGroup = groupName === 'Marketing';
                  const isContentGroup = groupName === 'Content';
                  const isSupportGroup = groupName === 'Support';
                  const isExpanded = isProductsGroup ? productsExpanded : (isMarketingGroup ? marketingExpanded : (isContentGroup ? contentExpanded : (isSupportGroup ? supportExpanded : true)));
                  const isMainGroup = groupName === 'Main';
                  
                  return (
                    <li key={groupName}>
                      {!isMainGroup && (
                        <button
                          type="button"
                          onClick={() => handleGroupToggle(groupName)}
                          className={`w-full flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${
                            (isProductsGroup && isProductsActive) || (isMarketingGroup && isMarketingActive) || (isContentGroup && isContentActive) || (isSupportGroup && isSupportActive) ? 'text-foreground' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isProductsGroup && (
                              <CatalogIcon className="h-4 w-4" />
                            )}
                            {isMarketingGroup && (
                              <FireIcon className="h-4 w-4" />
                            )}
                            {isContentGroup && (
                              <DocumentTextIcon className="h-4 w-4" />
                            )}
                            {isSupportGroup && (
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            )}
                            <span>{groupName}</span>
                          </div>
                          {(isProductsGroup || isMarketingGroup || isContentGroup || isSupportGroup) && (
                            <ChevronDownIcon
                              className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                            />
                          )}
                        </button>
                      )}
                      {isExpanded && (
                        <ul role="list" className="space-y-1">
                          {items.map((item: any) => {
                            // Dashboard should only be active when pathname is exactly /dashboard
                            const isActive = item.name === 'Dashboard' 
                              ? pathname === item.href
                              : pathname === item.href || pathname.startsWith(item.href + '/');
                            const isItemPending = pendingHref === item.href;
                            return (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigateWithLoading(item.href);
                                    setMobileMenuOpen(false);
                                  }}
                                  className={`group flex gap-x-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                                    item.submenu ? 'px-6' : 'px-3'
                                  } ${
                                    isActive
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                  }`}
                                  aria-busy={isItemPending}
                                >
                                  <item.icon
                                    className={`h-5 w-5 shrink-0 ${
                                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <span className="flex items-center gap-2">
                                    {item.name}
                                    {isItemPending && (
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/60 border-t-transparent" />
                                    )}
                                  </span>
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
                const isProductsGroup = groupName === 'Products';
                const isMarketingGroup = groupName === 'Marketing';
                const isContentGroup = groupName === 'Content';
                const isSupportGroup = groupName === 'Support';
                const isExpanded = isProductsGroup ? productsExpanded : (isMarketingGroup ? marketingExpanded : (isContentGroup ? contentExpanded : (isSupportGroup ? supportExpanded : true)));
                const isMainGroup = groupName === 'Main';
                
                return (
                  <li key={groupName}>
                    {!collapsed && !isMainGroup && (
                      <button
                        type="button"
                        onClick={() => handleGroupToggle(groupName)}
                        className={`w-full flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${
                          (isProductsGroup && isProductsActive) || (isMarketingGroup && isMarketingActive) || (isContentGroup && isContentActive) || (isSupportGroup && isSupportActive) ? 'text-foreground' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isProductsGroup && (
                            <CatalogIcon className="h-4 w-4" />
                          )}
                          {isMarketingGroup && (
                            <FireIcon className="h-4 w-4" />
                          )}
                          {isContentGroup && (
                            <DocumentTextIcon className="h-4 w-4" />
                          )}
                          {isSupportGroup && (
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          )}
                          <span>{groupName}</span>
                        </div>
                        {(isProductsGroup || isMarketingGroup || isContentGroup || isSupportGroup) && (
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                          />
                        )}
                      </button>
                    )}
                    {isExpanded && (
                      <ul role="list" className="flex flex-col gap-y-1">
                        {items.map((item: any) => {
                          const isActive =
                            item.name === 'Dashboard'
                              ? pathname === item.href
                              : pathname === item.href || pathname.startsWith(item.href + '/');
                          const isItemPending = pendingHref === item.href;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigateWithLoading(item.href);
                                }}
                                className={`group flex gap-x-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                                  item.submenu ? 'px-6' : 'px-3'
                                } ${
                                  collapsed ? 'justify-center' : ''
                                } ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                                title={collapsed ? item.name : undefined}
                                aria-busy={isItemPending}
                              >
                                <item.icon
                                  className={`h-5 w-5 shrink-0 ${
                                    isActive
                                      ? 'text-primary-foreground'
                                      : 'text-muted-foreground group-hover:text-accent-foreground'
                                  }`}
                                  aria-hidden="true"
                                />
                                {!collapsed && (
                                  <span className="flex items-center gap-2">
                                    {item.name}
                                    {isItemPending && (
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/60 border-t-transparent" />
                                    )}
                                  </span>
                                )}
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
