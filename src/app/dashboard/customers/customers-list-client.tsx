/**
 * Customers List Client Component
 * 
 * Displays list of customers with filtering, search, and actions
 */

'use client';

import { useState, useTransition } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EyeIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrency } from '@/lib/currency/currency-context';

interface Customer {
  id: string;
  name: string;
  email: string;
  username: string | null;
  mobile: string | null;
  company: string | null;
  email_verified: boolean | null;
  image: string | null;
  stats: {
    orders: number;
    total_spent: number;
    cart_items: number;
    reviews: number;
    wishlist_items: number;
    support_tickets: number;
  };
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface CustomersListClientProps {
  initialCustomers: Customer[];
  initialPagination: Pagination | null;
  dbError: string | null;
  currentSearchParams: {
    page: number;
    limit: number;
    search: string;
    email: string;
  };
}

export default function CustomersListClient({
  initialCustomers,
  initialPagination,
  dbError,
  currentSearchParams,
}: Readonly<CustomersListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();

  const [search, setSearch] = useState(currentSearchParams.search);
  const [email, setEmail] = useState(currentSearchParams.email);
  const [isExporting, setIsExporting] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }

    if (email) {
      params.set('email', email);
    } else {
      params.delete('email');
    }

    params.set('page', '1');
    startTransition(() => {
      router.push(`/dashboard/customers?${params.toString()}`);
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      const response = await fetch(`/api/customers/export?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting customers:', error);
      alert('Failed to export customers');
    } finally {
      setIsExporting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n: any) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const pagination = initialPagination || {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer accounts and view customer information
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} variant="outline">
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, email, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Filter by email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            {pagination.total} customer{pagination.total !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbError ? (
            <div className="text-center py-8 text-destructive">{dbError}</div>
          ) : initialCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found. Start by creating your first customer.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialCustomers.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {customer.image ? (
                                  <img
                                    src={customer.image}
                                    alt={customer.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(customer.name)
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              {customer.username && (
                                <div className="text-sm text-muted-foreground">
                                  @{customer.username}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{customer.email}</div>
                            {customer.mobile && (
                              <div className="text-sm text-muted-foreground">
                                {customer.mobile}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{customer.stats.orders}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.stats.wishlist_items} wishlist
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(customer.stats.total_spent)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.email_verified ? (
                            <Badge variant="default">Verified</Badge>
                          ) : (
                            <Badge variant="secondary">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/customers/${customer.id}`}>
                              <EyeIcon className="h-4 w-4" />
                              <span className="sr-only">View customer</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} customers
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1 || isPending}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', String(pagination.page - 1));
                        startTransition(() => {
                          router.push(`/dashboard/customers?${params.toString()}`);
                        });
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.total_pages || isPending}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', String(pagination.page + 1));
                        startTransition(() => {
                          router.push(`/dashboard/customers?${params.toString()}`);
                        });
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

