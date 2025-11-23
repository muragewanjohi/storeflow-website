/**
 * Dashboard Header Component
 * 
 * Top header with sidebar toggle, settings, theme toggle, and profile menu
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { type Tenant } from '@/lib/tenant-context';
import { type AuthUser } from '@/lib/auth/types';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  user: AuthUser;
  tenant: Tenant;
  onMobileMenuClick?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
}

export default function DashboardHeader({ 
  user, 
  tenant, 
  onMobileMenuClick,
  onSidebarToggle,
  sidebarCollapsed = false,
}: Readonly<HeaderProps>) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
        router.refresh();
      } else {
        console.error('Logout failed');
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  // Get user initials for avatar
  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      {onMobileMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuClick}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </Button>
      )}

      {/* Sidebar collapse button (desktop only) */}
      {onSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex"
          onClick={onSidebarToggle}
        >
          <span className="sr-only">{sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          {sidebarCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      )}

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Settings button */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <span className="sr-only">Settings</span>
            <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative"
        >
          <span className="sr-only">Toggle theme</span>
          <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.email}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

