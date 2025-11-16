/**
 * Admin Layout Client Component
 * 
 * Client-side wrapper for admin layout with mobile menu state
 */

'use client';

import { useState } from 'react';
import { type AuthUser } from '@/lib/auth/types';
import AdminSidebar from './sidebar';
import AdminHeader from './header';

interface LayoutClientProps {
  user: AuthUser;
  children: React.ReactNode;
}

export default function AdminLayoutClient({ user, children }: Readonly<LayoutClientProps>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar 
        user={user} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div className={sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}>
        <AdminHeader 
          user={user} 
          onMobileMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

