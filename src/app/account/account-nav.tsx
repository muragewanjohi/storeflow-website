/**
 * Account Navigation Component
 * 
 * Sidebar navigation for customer account pages
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const navItems = [
  {
    name: 'Dashboard',
    href: '/account',
    icon: HomeIcon,
  },
  {
    name: 'Notifications',
    href: '/account/notifications',
    icon: BellIcon,
  },
  {
    name: 'Orders',
    href: '/account/orders',
    icon: ShoppingBagIcon,
  },
  {
    name: 'Settings',
    href: '/account/settings',
    icon: Cog6ToothIcon,
  },
];

export default function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await fetch('/api/customers/notifications/count');
        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/customers/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // Redirect to home page after logout
        router.push('/');
        router.refresh(); // Refresh to update auth state
      } else {
        console.error('Failed to logout');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="space-y-1">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">My Account</h2>
      </div>
      {navItems.map((item: any) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || 
          (item.href !== '/account' && pathname?.startsWith(item.href));
        
        // Show notification badge across account entry points if there are pending quotes
        const showBadge =
          notificationCount > 0 &&
          (item.href === '/account' || item.href === '/account/orders' || item.href === '/account/notifications');
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors relative',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              {item.name}
            </div>
            {showBadge && (
              <Badge 
                variant="destructive" 
                className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Link>
        );
      })}
      
      {/* Sign Out Button */}
      <div className="mt-6 pt-6 border-t">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}

