/**
 * Roles & Permissions Client Component
 * 
 * Displays roles and their permissions in an easy-to-understand format
 * Based on best practices from Shopify, WooCommerce, and other e-commerce platforms
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShieldCheckIcon, 
  UserIcon, 
  UserGroupIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { getRolePermissions, type Permission } from '@/lib/auth/permissions';
import type { UserRole } from '@/lib/auth/types';

interface RoleInfo {
  role: UserRole;
  name: string;
  description: string;
  icon: typeof ShieldCheckIcon;
  color: string;
  badgeColor: string;
}

const ROLES: RoleInfo[] = [
  {
    role: 'tenant_admin',
    name: 'Admin',
    description: 'Full access to all store features. Can manage products, orders, customers, settings, users, and billing.',
    icon: ShieldCheckIcon,
    color: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  {
    role: 'tenant_staff',
    name: 'Staff',
    description: 'Limited access. Can view and update products, orders, and customers. Cannot delete items or access settings.',
    icon: UserGroupIcon,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
];

// Permission categories for better organization
export const PERMISSION_CATEGORIES = {
  'Dashboard': ['dashboard.read'],
  'Products': ['products.create', 'products.read', 'products.update', 'products.delete'],
  'Orders': ['orders.create', 'orders.read', 'orders.update', 'orders.delete'],
  'Customers': ['customers.create', 'customers.read', 'customers.update', 'customers.delete'],
  'Users & Team': ['users.create', 'users.read', 'users.update', 'users.delete'],
  'Settings': ['settings.read', 'settings.update'],
  'Analytics': ['analytics.read'],
  'Themes': ['themes.read', 'themes.update'],
  'Sales': ['sales.read', 'sales.create', 'sales.update', 'sales.delete'],
  'Subscription': ['subscription.read'],
  'Content': ['pages.read', 'pages.create', 'pages.update', 'pages.delete', 'blogs.read', 'blogs.create', 'blogs.update', 'blogs.delete', 'forms.read', 'forms.create', 'forms.update', 'forms.delete', 'media.read', 'media.create', 'media.update', 'media.delete'],
  'Support': ['support.read', 'support.create', 'support.update', 'support.platform.read'],
} as const;

// Human-readable permission labels (exported for use in other components)
export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.read': 'Access Dashboard',
  'products.create': 'Create Products',
  'products.read': 'View Products',
  'products.update': 'Edit Products',
  'products.delete': 'Delete Products',
  'orders.create': 'Create Orders',
  'orders.read': 'View Orders',
  'orders.update': 'Update Orders',
  'orders.delete': 'Delete Orders',
  'customers.create': 'Create Customers',
  'customers.read': 'View Customers',
  'customers.update': 'Edit Customers',
  'customers.delete': 'Delete Customers',
  'users.create': 'Add Users',
  'users.read': 'View Users',
  'users.update': 'Edit Users',
  'users.delete': 'Remove Users',
  'settings.read': 'View Settings',
  'settings.update': 'Change Settings',
  'analytics.read': 'View Analytics',
  'themes.read': 'View Themes',
  'themes.update': 'Customize Themes',
  'sales.read': 'View Sales',
  'sales.create': 'Create Sales',
  'sales.update': 'Edit Sales',
  'sales.delete': 'Delete Sales',
  'subscription.read': 'View Subscription',
  'pages.read': 'View Pages',
  'pages.create': 'Create Pages',
  'pages.update': 'Edit Pages',
  'pages.delete': 'Delete Pages',
  'blogs.read': 'View Blogs',
  'blogs.create': 'Create Blogs',
  'blogs.update': 'Edit Blogs',
  'blogs.delete': 'Delete Blogs',
  'forms.read': 'View Forms',
  'forms.create': 'Create Forms',
  'forms.update': 'Edit Forms',
  'forms.delete': 'Delete Forms',
  'media.read': 'View Media',
  'media.create': 'Upload Media',
  'media.update': 'Edit Media',
  'media.delete': 'Delete Media',
  'support.read': 'View Support Tickets',
  'support.create': 'Create Support Tickets',
  'support.update': 'Update Support Tickets',
  'support.platform.read': 'View Platform Support',
  'tenants.create': 'Create Tenants',
  'tenants.read': 'View Tenants',
  'tenants.update': 'Edit Tenants',
  'tenants.delete': 'Delete Tenants',
};

export default function RolesPermissionsClient() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Understand what each role can do in your store. Assign roles when adding or editing team members.
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger 
            value="roles"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Roles Overview
          </TabsTrigger>
          <TabsTrigger 
            value="comparison"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Compare Roles
          </TabsTrigger>
        </TabsList>

        {/* Roles Overview Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {ROLES.map((roleInfo) => {
              const permissions = getRolePermissions(roleInfo.role);
              const Icon = roleInfo.icon;

              return (
                <Card key={roleInfo.role} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${roleInfo.badgeColor}`}>
                        <Icon className={`h-6 w-6 ${roleInfo.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {roleInfo.name}
                          <Badge className={roleInfo.badgeColor}>
                            {permissions.length} Permissions
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {roleInfo.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => {
                        const rolePermissionsInCategory = categoryPermissions.filter((perm) =>
                          permissions.includes(perm as Permission)
                        );

                        if (rolePermissionsInCategory.length === 0) {
                          return null;
                        }

                        return (
                          <div key={category} className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              {category}
                            </h4>
                            <div className="space-y-1.5">
                              {categoryPermissions.map((perm) => {
                                const hasPermission = permissions.includes(perm as Permission);
                                if (!hasPermission) return null;

                                return (
                                  <div
                                    key={perm}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    <span>{PERMISSION_LABELS[perm as Permission]}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reference</CardTitle>
              <CardDescription>
                Common tasks and which roles can perform them
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { task: 'Add new products', roles: ['Admin'] },
                  { task: 'Edit product details', roles: ['Admin', 'Staff'] },
                  { task: 'Delete products', roles: ['Admin'] },
                  { task: 'View and manage orders', roles: ['Admin', 'Staff'] },
                  { task: 'Cancel or refund orders', roles: ['Admin'] },
                  { task: 'View customer information', roles: ['Admin', 'Staff'] },
                  { task: 'Add team members', roles: ['Admin'] },
                  { task: 'Change store settings', roles: ['Admin'] },
                  { task: 'View analytics and reports', roles: ['Admin'] },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.task}</p>
                    </div>
                    <div className="flex gap-2">
                      {item.roles.map((role) => (
                        <Badge
                          key={role}
                          variant={role === 'Admin' ? 'default' : 'secondary'}
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compare Roles Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison of what each role can do
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Permission</th>
                      {ROLES.map((roleInfo) => (
                        <th key={roleInfo.role} className="text-center py-3 px-4 font-semibold">
                          <div className="flex flex-col items-center gap-1">
                            <Badge className={roleInfo.badgeColor}>{roleInfo.name}</Badge>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => (
                      <React.Fragment key={category}>
                        <tr className="bg-muted/50">
                          <td colSpan={ROLES.length + 1} className="py-2 px-4 font-semibold text-sm uppercase tracking-wide">
                            {category}
                          </td>
                        </tr>
                        {categoryPermissions.map((perm) => {
                          const permissionLabel = PERMISSION_LABELS[perm as Permission];
                          return (
                            <tr key={perm} className="border-b hover:bg-muted/30">
                              <td className="py-3 px-4">{permissionLabel}</td>
                              {ROLES.map((roleInfo) => {
                                const permissions = getRolePermissions(roleInfo.role);
                                const hasPermission = permissions.includes(perm as Permission);
                                return (
                                  <td key={roleInfo.role} className="text-center py-3 px-4">
                                    {hasPermission ? (
                                      <CheckCircleIcon className="h-5 w-5 text-green-600 mx-auto" />
                                    ) : (
                                      <XCircleIcon className="h-5 w-5 text-gray-300 mx-auto" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
