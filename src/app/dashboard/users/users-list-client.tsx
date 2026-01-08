/**
 * Users List Client Component
 * 
 * Displays list of tenant users with actions
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'tenant_admin' | 'tenant_staff';
  created_at: string;
  last_sign_in_at?: string | null;
}

interface UsersListClientProps {
  users: User[];
  currentUserId: string;
  canAddUsers: boolean;
  planName: string | null;
}

export default function UsersListClient({ users, currentUserId, canAddUsers, planName }: Readonly<UsersListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Check for upgrade required message from query params
  useEffect(() => {
    if (searchParams.get('error') === 'upgrade_required') {
      setError('Your current plan does not allow adding staff or admin users. Please upgrade your plan to continue.');
      // Clean up the URL
      router.replace('/dashboard/users', { scroll: false });
    }
  }, [searchParams, router]);

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === currentUserId) {
      setError('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete user');
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'tenant_admin':
        return 'bg-purple-100 text-purple-800';
      case 'tenant_staff':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and their permissions
          </p>
        </div>
        {canAddUsers ? (
          <Button asChild>
            <Link href="/dashboard/users/new">Add User</Link>
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <Button 
              onClick={() => setShowUpgradeDialog(true)}
              className="cursor-pointer"
            >
              Add User
            </Button>
            <p className="text-xs text-muted-foreground text-right max-w-[200px]">
              Upgrade your plan to add staff or admins
            </p>
            <Button 
              onClick={() => setShowUpgradeDialog(true)}
              variant="outline" 
              size="sm"
            >
              Upgrade Plan
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Action Restricted</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {!canAddUsers && (
              <Button 
                onClick={() => router.push('/dashboard/subscription?tab=plans')}
                variant="outline" 
                size="sm" 
                className="ml-4"
              >
                View Plans & Pricing
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <p className="text-sm text-muted-foreground mb-4">No users found</p>
            {canAddUsers ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/users/new">Create your first user</Link>
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {planName 
                    ? `Your current plan (${planName}) does not allow adding staff or admin users.`
                    : 'You need an active plan to add staff or admin users.'}
                </p>
                <Button onClick={() => setShowUpgradeDialog(true)}>
                  View Plans & Pricing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || 'No name'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.role === 'tenant_admin' ? 'Admin' : 'Staff'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/users/${user.id}`}>Edit</Link>
                        </Button>
                        {user.id !== currentUserId && (
                          <Button
                            onClick={() => handleDelete(user.id, user.name || user.email)}
                            disabled={deletingId === user.id}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === user.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Confirmation Dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Your current plan ({planName || 'Basic Plan'}) does not allow adding staff or admin users.
              </p>
              <p>
                Would you like to upgrade your plan to unlock this feature?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                router.push('/dashboard/subscription?tab=plans');
              }}
            >
              View Plans & Pricing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

