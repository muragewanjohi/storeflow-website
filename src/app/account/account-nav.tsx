/**
 * Account Navigation Component
 * 
 * Sidebar navigation for customer account pages
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  {
    name: 'Dashboard',
    href: '/account',
    icon: HomeIcon,
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
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            {item.name}
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

