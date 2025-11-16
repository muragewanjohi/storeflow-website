/**
 * Tenants List Client Component
 * 
 * Client component for displaying and managing tenants
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  status: string | null;
  created_at: Date | null;
  expire_date: Date | null;
}

interface TenantsListClientProps {
  tenants: Tenant[];
}

export default function TenantsListClient({ tenants }: Readonly<TenantsListClientProps>) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(tenantId);
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete tenant');
        setIsDeleting(null);
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('An error occurred while deleting the tenant');
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500">Suspended</Badge>;
      case 'expired':
        return <Badge className="bg-red-500">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Tenants</CardTitle>
            <CardDescription>
              {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} registered
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/tenants/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Tenant
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No tenants found</p>
            <Button asChild>
              <Link href="/admin/tenants/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Your First Tenant
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Custom Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {tenant.subdomain}
                    </code>
                  </TableCell>
                  <TableCell>
                    {tenant.custom_domain ? (
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {tenant.custom_domain}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>
                    {tenant.created_at
                      ? new Date(tenant.created_at).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {tenant.expire_date
                      ? new Date(tenant.expire_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link href={`/admin/tenants/${tenant.id}`}>
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tenant.id)}
                        disabled={isDeleting === tenant.id}
                      >
                        <TrashIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

