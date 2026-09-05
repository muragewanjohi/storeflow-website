/**
 * Create User Form Component
 * 
 * Form for creating new tenant users (admin or staff)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { type Permission } from '@/lib/auth/permissions';
import { PERMISSION_CATEGORIES, PERMISSION_LABELS } from '@/app/dashboard/users/roles/roles-permissions-client';

export default function CreateUserForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'tenant_staff' as 'tenant_admin' | 'tenant_staff',
    customPermissions: [] as Permission[],
    useCustomPermissions: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          customPermissions: formData.useCustomPermissions ? formData.customPermissions : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If it's a plan restriction error, redirect to users page with upgrade message
        if (response.status === 403 && data.error === 'Plan restriction') {
          router.push('/dashboard/users?error=upgrade_required');
          return;
        }
        throw new Error(data.message || data.error || 'Failed to create user');
      }

      // Redirect to users list
      router.push('/dashboard/users');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
        <CardDescription>
          Add a new team member and assign their role and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={validationErrors.name ? 'border-destructive' : ''}
            />
            {validationErrors.name && (
              <p className="text-sm text-destructive">{validationErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={validationErrors.email ? 'border-destructive' : ''}
            />
            {validationErrors.email && (
              <p className="text-sm text-destructive">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as 'tenant_admin' | 'tenant_staff' })
                }
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_staff">Staff</SelectItem>
                  <SelectItem value="tenant_admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === 'tenant_admin'
                  ? 'Admin users have full access to manage products, orders, customers, and users.'
                  : 'Staff users have limited access - they can view and update but cannot create or delete.'}
              </p>
            </div>

            {/* Custom Permissions Option */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useCustomPermissions"
                  checked={formData.useCustomPermissions}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, useCustomPermissions: checked as boolean })
                  }
                />
                <Label htmlFor="useCustomPermissions" className="font-medium cursor-pointer">
                  Use custom permissions (override role defaults)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Select specific permissions for this user instead of using the default role permissions
              </p>

              {formData.useCustomPermissions && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Custom Permissions</CardTitle>
                    <CardDescription className="text-xs">
                      Select the specific permissions this user should have
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => {
                        // Filter out permissions that tenants cannot have
                        const filteredPermissions = categoryPermissions.filter(
                          (perm) => perm !== 'orders.create' && perm !== 'customers.create'
                        ) as Permission[];

                        // Skip category if all permissions are filtered out
                        if (filteredPermissions.length === 0) {
                          return null;
                        }

                        return (
                          <div key={category} className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              {category}
                            </h4>
                            <div className="space-y-2">
                              {filteredPermissions.map((permission) => {
                                const isChecked = formData.customPermissions.includes(permission);
                                return (
                                  <div key={permission} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`perm-${permission}`}
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setFormData({
                                            ...formData,
                                            customPermissions: [...formData.customPermissions, permission],
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            customPermissions: formData.customPermissions.filter((p) => p !== permission),
                                          });
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`perm-${permission}`}
                                      className="text-sm cursor-pointer font-normal"
                                    >
                                      {PERMISSION_LABELS[permission]}
                                    </Label>
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
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={validationErrors.password ? 'border-destructive' : ''}
            />
            {validationErrors.password && (
              <p className="text-sm text-destructive">{validationErrors.password}</p>
            )}
            <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={validationErrors.confirmPassword ? 'border-destructive' : ''}
            />
            {validationErrors.confirmPassword && (
              <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
            )}
          </div>

          <CardFooter className="flex justify-end gap-4 pt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create User'}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}

