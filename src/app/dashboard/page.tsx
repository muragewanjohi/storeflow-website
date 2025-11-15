/**
 * Tenant Dashboard (Protected Route)
 * 
 * Tenant admin/staff dashboard - requires tenant admin or staff role
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import Link from 'next/link';
import {
  CubeIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function TenantDashboardPage() {
  // Redirect to login if not authenticated or not tenant admin/staff
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Verify user belongs to current tenant
  const tenant = await requireTenant();
  if (user.tenant_id !== tenant.id && user.role !== 'landlord') {
    redirect('/login');
  }

  const quickActions = [
    {
      name: 'Products',
      href: '/dashboard/products',
      description: 'Manage your product catalog',
      icon: CubeIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Orders',
      href: '/dashboard/orders',
      description: 'View and manage orders',
      icon: ShoppingCartIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Customers',
      href: '/dashboard/customers',
      description: 'Manage customer information',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.email}. Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <CubeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.name} className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href={action.href}>
                <CardContent className="p-6 flex items-center space-x-3">
                  <div className={`flex-shrink-0 ${action.color} rounded-md p-3`}>
                    <action.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity to display.</p>
        </CardContent>
      </Card>
    </div>
  );
}

