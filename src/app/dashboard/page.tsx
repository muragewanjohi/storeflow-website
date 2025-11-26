/**
 * Tenant Dashboard (Protected Route)
 * 
 * Tenant admin/staff dashboard - requires tenant admin or staff role
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import Link from 'next/link';
import {
  CubeIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function TenantDashboardPage() {
  // Redirect to login if not authenticated or not tenant admin/staff
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Verify user belongs to current tenant
  const tenant = await requireTenant();
  if (user.tenant_id !== tenant.id && user.role !== 'landlord') {
    redirect('/login');
  }

  // Check if tenant is newly created (within last 24 hours)
  const isNewTenant = tenant.created_at && 
    new Date(tenant.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  // Get tenant plan info if exists
  let planInfo = null;
  if (tenant.plan_id) {
    planInfo = await prisma.price_plans.findUnique({
      where: { id: tenant.plan_id },
      select: {
        name: true,
        price: true,
        duration_months: true,
      },
    });
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

      {/* Welcome Message for New Tenants */}
      {isNewTenant && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-primary" />
              <CardTitle>Welcome to StoreFlow!</CardTitle>
            </div>
            <CardDescription>
              Your store <strong>{tenant.name}</strong> has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                🎉 Congratulations! Your store is now live at{' '}
                <strong>{tenant.subdomain}.dukanest.com</strong>
              </p>
              {planInfo ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current Plan:</span>
                  <Badge variant="secondary">
                    {planInfo.name} - ${Number(planInfo.price).toFixed(2)}/{planInfo.duration_months === 1 ? 'month' : `${planInfo.duration_months} months`}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> Select a subscription plan to unlock all features.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href="/dashboard/settings">Configure Store</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/users">Invite Team Members</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

