/**
 * Tenants List Client Component
 * 
 * Client component for displaying and managing tenants
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PlusIcon, PencilIcon, TrashIcon, ArrowTopRightOnSquareIcon, MagnifyingGlassIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all'); // 'all', 'demo', 'regular'

  // Check if tenant is a demo store
  const isDemoStore = (tenant: Tenant): boolean => {
    return tenant.data?.is_demo === true || tenant.data?.isDemo === true;
  };

  // Extract business type from tenant name or data
  const getBusinessType = (tenant: Tenant): string => {
    if (tenant.data?.business_type) {
      return tenant.data.business_type;
    }
    // Extract from name (e.g., "Grocery Store / Supermarket Demo Store" -> "Grocery Store / Supermarket")
    const name = tenant.name || '';
    if (name.includes('Demo Store')) {
      return name.replace(' Demo Store', '').trim();
    }
    return 'Unknown';
  };

  // Extract specific selling category, fallback to business type
  const getSelling = (tenant: Tenant): string => {
    if (tenant.data?.selling) {
      return tenant.data.selling;
    }
    return getBusinessType(tenant);
  };

  // Handle seed demo stores
  const handleSeedDemoStores = async () => {
    if (!confirm('This will create 12 demo stores (one for each business type) with 50 products, 10 categories, 5 customers, and 10 orders each. This may take a few minutes. Continue?')) {
      return;
    }

    setIsSeeding(true);
    try {
      const response = await fetch('/api/admin/demo-stores/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Demo stores seed process started! Check logs for progress.', {
          description: 'The stores are being created in the background. Refresh the page in a few minutes.',
          duration: 8000,
        });
        // Refresh after a delay to see new stores
        setTimeout(() => {
          router.refresh();
        }, 3000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start seed process');
        setIsSeeding(false);
      }
    } catch (error) {
      console.error('Error seeding demo stores:', error);
      toast.error('An error occurred while starting the seed process');
      setIsSeeding(false);
    }
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

  // Separate demo stores and regular tenants
  const demoStores = useMemo(() => {
    return tenants.filter((tenant) => isDemoStore(tenant));
  }, [tenants]);

  const regularTenants = useMemo(() => {
    return tenants.filter((tenant) => !isDemoStore(tenant));
  }, [tenants]);

  // Filter tenants based on search query, status, and type (demo/regular)
  const filteredTenants = useMemo(() => {
    let filtered = tenants;

    // Filter by type (demo vs regular)
    if (activeTab === 'demo') {
      filtered = filtered.filter((tenant) => isDemoStore(tenant));
    } else if (activeTab === 'regular') {
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
        const businessType = getBusinessType(tenant).toLowerCase();
        const selling = getSelling(tenant).toLowerCase();
        return (
          name.includes(query) ||
          subdomain.includes(query) ||
          customDomain.includes(query) ||
          businessType.includes(query) ||
          selling.includes(query)
        );
      });
    }

    return filtered;
  }, [tenants, searchQuery, statusFilter, activeTab]);

  // Filter demo stores for search
  const filteredDemoStores = useMemo(() => {
    let filtered = demoStores;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((tenant) => {
        const name = tenant.name?.toLowerCase() || '';
        const subdomain = tenant.subdomain?.toLowerCase() || '';
        const businessType = getBusinessType(tenant).toLowerCase();
        const selling = getSelling(tenant).toLowerCase();
        return (
          name.includes(query) ||
          subdomain.includes(query) ||
          businessType.includes(query) ||
          selling.includes(query)
        );
      });
    }

    return filtered;
  }, [demoStores, searchQuery]);

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
      demo: demoStores.length,
      regular: regularTenants.length,
    };
  }, [tenants, demoStores, regularTenants]);

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
              {activeTab === 'all' && `${filteredTenants.length} of ${tenants.length} tenant${tenants.length !== 1 ? 's' : ''} shown`}
              {activeTab === 'demo' && `${filteredDemoStores.length} demo store${filteredDemoStores.length !== 1 ? 's' : ''} available`}
              {activeTab === 'regular' && `${filteredTenants.length} of ${regularTenants.length} regular tenant${regularTenants.length !== 1 ? 's' : ''} shown`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'demo' && (
              <Button
                variant="outline"
                onClick={handleSeedDemoStores}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <>
                    <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="mr-2 h-4 w-4" />
                    Seed Demo Stores
                  </>
                )}
              </Button>
            )}
            <Button asChild>
              <Link href="/admin/tenants/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Tenant
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Tabs: All, Demo Stores, Regular */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

          {/* All Tenants Tab */}
          <TabsContent value="all" className="space-y-4">
            {/* Search and Filter */}
            <div className="space-y-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, subdomain, or custom domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

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
                    : searchQuery || statusFilter !== 'all'
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
          </TabsContent>

          {/* Demo Stores Tab - Card View */}
          <TabsContent value="demo" className="space-y-4">
            {/* Search for Demo Stores */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                  placeholder="Search demo stores by name, business type, selling, or subdomain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredDemoStores.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {demoStores.length === 0
                    ? 'No demo stores found. Click "Seed Demo Stores" to create them.'
                    : 'No demo stores match your search criteria'}
                </p>
                {demoStores.length === 0 && (
                  <Button
                    onClick={handleSeedDemoStores}
                    disabled={isSeeding}
                  >
                    {isSeeding ? (
                      <>
                        <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                        Seeding Demo Stores...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="mr-2 h-4 w-4" />
                        Seed Demo Stores
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDemoStores.map((tenant: any) => {
                  const businessType = getBusinessType(tenant);
                  const selling = getSelling(tenant);
                  const storeUrl = `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com'}`;
                  
                  return (
                    <Card key={tenant.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative h-32 bg-gradient-to-br from-purple-500 to-blue-500">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative w-20 h-20 rounded-lg bg-white/90 p-2 shadow-lg">
                            <Image
                              src="/logo.png"
                              alt={tenant.name}
                              fill
                              className="object-contain"
                              sizes="80px"
                            />
                          </div>
                        </div>
                        <Badge className="absolute top-2 right-2 bg-purple-600">Demo</Badge>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                        <CardDescription>
                          {businessType}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Selling:</span>
                            <span className="font-medium text-right max-w-[60%] truncate" title={selling}>
                              {selling}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Subdomain:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{tenant.subdomain}</code>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            {getStatusBadge(tenant.status)}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
                            Visit Store
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetDemo(tenant.id, tenant.name)}
                          disabled={isResetting === tenant.id}
                          title="Reset Demo Store"
                        >
                          <ArrowPathIcon className={`h-4 w-4 ${isResetting === tenant.id ? 'animate-spin' : ''}`} />
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Regular Tenants Tab */}
          <TabsContent value="regular" className="space-y-4">
            {/* Search and Filter */}
            <div className="space-y-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, subdomain, or custom domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

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
                  {regularTenants.length === 0
                    ? 'No regular tenants found'
                    : searchQuery || statusFilter !== 'all'
                      ? 'No tenants match your search criteria'
                      : 'No tenants found'}
                </p>
                {regularTenants.length === 0 && (
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
                        {tenant.name}
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
                        {tenant.expire_date ? (
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

