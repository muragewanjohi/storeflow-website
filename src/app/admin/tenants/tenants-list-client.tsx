/**
 * Tenants List Client Component
 * 
 * Client component for displaying and managing tenants
 */

'use client';

import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlusIcon, PencilIcon, TrashIcon, ArrowTopRightOnSquareIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  status: string | null;
  created_at: Date | null;
  expire_date: Date | null;
  data?: any; // JSON field that may contain isDemo flag
}

interface TenantsListClientProps {
  tenants: Tenant[];
}

export default function TenantsListClient({ tenants }: Readonly<TenantsListClientProps>) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // 'all', 'demo', 'regular'

  // Check if tenant is a demo store
  const isDemoStore = (tenant: Tenant): boolean => {
    return tenant.data?.isDemo === true;
  };

  const handleResetDemo = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to reset "${tenantName}"? This will delete all products, orders, and content, then re-seed with fresh demo data.`)) {
      return;
    }

    setIsResetting(tenantId);
    try {
      const response = await fetch('/api/admin/demo-stores/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        toast.success('Demo store reset successfully');
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reset demo store');
        setIsResetting(null);
      }
    } catch (error) {
      console.error('Error resetting demo store:', error);
      toast.error('An error occurred while resetting the demo store');
      setIsResetting(null);
    }
  };

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

  // Filter tenants based on search query, status, and type (demo/regular)
  const filteredTenants = useMemo(() => {
    let filtered = tenants;

    // Filter by type (demo vs regular)
    if (typeFilter === 'demo') {
      filtered = filtered.filter((tenant) => isDemoStore(tenant));
    } else if (typeFilter === 'regular') {
      filtered = filtered.filter((tenant) => !isDemoStore(tenant));
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((tenant) => tenant.status === statusFilter);
    }

    // Filter by search query (name, subdomain, custom_domain)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((tenant) => {
        const name = tenant.name?.toLowerCase() || '';
        const subdomain = tenant.subdomain?.toLowerCase() || '';
        const customDomain = tenant.custom_domain?.toLowerCase() || '';
        return (
          name.includes(query) ||
          subdomain.includes(query) ||
          customDomain.includes(query)
        );
      });
    }

    return filtered;
  }, [tenants, searchQuery, statusFilter, typeFilter]);

  // Count tenants by status
  const statusCounts = useMemo(() => {
    return {
      all: tenants.length,
      active: tenants.filter((t) => t.status === 'active').length,
      suspended: tenants.filter((t) => t.status === 'suspended').length,
      expired: tenants.filter((t) => t.status === 'expired').length,
      deleted: tenants.filter((t) => t.status === 'deleted').length,
    };
  }, [tenants]);

  // Count tenants by type (demo vs regular)
  const typeCounts = useMemo(() => {
    return {
      all: tenants.length,
      demo: tenants.filter((t) => isDemoStore(t)).length,
      regular: tenants.filter((t) => !isDemoStore(t)).length,
    };
  }, [tenants]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500">Suspended</Badge>;
      case 'expired':
        return <Badge className="bg-orange-500">Expired</Badge>;
      case 'deleted':
        return <Badge variant="destructive">Deleted</Badge>;
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
              {filteredTenants.length} of {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} shown
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
        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, subdomain, or custom domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter Tabs (Demo vs Regular) */}
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 border border-border">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                All ({typeCounts.all})
              </TabsTrigger>
              <TabsTrigger 
                value="demo"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                Demo Stores ({typeCounts.demo})
              </TabsTrigger>
              <TabsTrigger 
                value="regular"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                Regular ({typeCounts.regular})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 border border-border">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger 
                value="active"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                Active ({statusCounts.active})
              </TabsTrigger>
              <TabsTrigger 
                value="suspended"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                Suspended ({statusCounts.suspended})
              </TabsTrigger>
              <TabsTrigger 
                value="expired"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                Expired ({statusCounts.expired})
              </TabsTrigger>
              <TabsTrigger 
                value="deleted"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
              >
                Deleted ({statusCounts.deleted})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredTenants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {tenants.length === 0
                ? 'No tenants found'
                : searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No tenants match your search criteria'
                  : 'No tenants found'}
            </p>
            {tenants.length === 0 && (
              <Button asChild>
                <Link href="/admin/tenants/new">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Your First Tenant
                </Link>
              </Button>
            )}
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
              {filteredTenants.map((tenant: any) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {tenant.name}
                      {isDemoStore(tenant) && (
                        <Badge variant="secondary" className="bg-purple-500 text-white">
                          Demo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(tenant.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.created_at
                      ? new Date(tenant.created_at).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {isDemoStore(tenant) ? (
                      <span className="text-muted-foreground italic">Never (Demo)</span>
                    ) : tenant.expire_date ? (
                      new Date(tenant.expire_date).toLocaleDateString()
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {tenant.status !== 'deleted' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Visit Store"
                          >
                            <a
                              href={`https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            </a>
                          </Button>
                          {isDemoStore(tenant) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResetDemo(tenant.id, tenant.name)}
                              disabled={isResetting === tenant.id}
                              title="Reset Demo Store"
                            >
                              <ArrowPathIcon className={`h-4 w-4 ${isResetting === tenant.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Edit Tenant"
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
                            title="Delete Tenant"
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {tenant.status === 'deleted' && (
                        <span className="text-xs text-muted-foreground">No actions available</span>
                      )}
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

