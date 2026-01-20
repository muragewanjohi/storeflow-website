/**
 * Edit User Form Component
 * 
 * Form for editing user details and roles
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

interface User {
  id: string;
  email: string;
  name: string;
  role: 'tenant_admin' | 'tenant_staff';
  customPermissions?: string[]; // Stored as string array, cast to Permission[] when needed
}

interface EditUserFormProps {
  user: User;
  currentUserId: string;
}

export default function EditUserForm({ user, currentUserId }: Readonly<EditUserFormProps>) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role,
    customPermissions: user.customPermissions || [],
    useCustomPermissions: (user.customPermissions && user.customPermissions.length > 0) || false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
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
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          customPermissions: formData.useCustomPermissions ? formData.customPermissions : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to update user');
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

  const isCurrentUser = user.id === currentUserId;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
        <p className="text-muted-foreground mt-2">Update user details and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>Update user information and role</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as 'tenant_admin' | 'tenant_staff' })
                  }
                  disabled={isCurrentUser}
                >
                  <SelectTrigger id="role" disabled={isCurrentUser}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_staff">Staff</SelectItem>
                    <SelectItem value="tenant_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {isCurrentUser && (
                  <p className="text-xs text-muted-foreground">
                    You cannot change your own role
                  </p>
                )}
                {!isCurrentUser && (
                  <p className="text-xs text-muted-foreground">
                    {formData.role === 'tenant_admin'
                      ? 'Admin users have full access to manage products, orders, customers, and users.'
                      : 'Staff users have limited access - they can view and update but cannot create or delete.'}
                  </p>
                )}
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
                    disabled={isCurrentUser}
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
                    <CardContent className="space-y-4">
                      {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {category}
                          </h4>
                          <div className="space-y-2 pl-4">
                            {categoryPermissions.map((perm) => {
                              const permission = perm as Permission;
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
                                    disabled={isCurrentUser}
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
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <CardFooter className="flex justify-end gap-4 pt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/users">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

