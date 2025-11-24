/**
 * Tenant Landlord Support Tickets List Client Component
 * 
 * Displays list of tickets created by tenant for the landlord
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface TenantLandlordTicketsListClientProps {
  initialTickets: Ticket[];
  initialPagination: Pagination | null;
  dbError: string | null;
  currentSearchParams: {
    page: number;
    limit: number;
    status: string;
  };
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'open':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'resolved':
      return 'default';
    case 'closed':
      return 'outline';
    default:
      return 'default';
  }
}

function getPriorityBadgeVariant(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'secondary';
  }
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPriority(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatCategory(category: string) {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function TenantLandlordTicketsListClient({
  initialTickets,
  initialPagination,
  dbError,
  currentSearchParams,
}: Readonly<TenantLandlordTicketsListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [status, setStatus] = useState(currentSearchParams.status || 'all');

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const params = new URLSearchParams(searchParams.toString());
    
    if (newStatus && newStatus !== 'all') {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/dashboard/support/landlord-tickets?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    startTransition(() => {
      router.push(`/dashboard/support/landlord-tickets?${params.toString()}`);
    });
  };

  if (dbError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Database Migration Required</CardTitle>
            <CardDescription>{dbError}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets to Platform</h1>
          <p className="text-muted-foreground mt-2">
            View and manage tickets you've created for platform support
          </p>
        </div>
        <Link href="/dashboard/support/landlord-tickets/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-48">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>
            {initialPagination?.total || 0} total ticket{initialPagination?.total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialTickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No support tickets found</p>
              <Link href="/dashboard/support/landlord-tickets/new">
                <Button>Create New Ticket</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {ticket.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatCategory(ticket.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ticket.status)}>
                            {formatStatus(ticket.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                            {formatPriority(ticket.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.message_count}</TableCell>
                        <TableCell>
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(ticket.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/support/landlord-tickets/${ticket.id}`}>
                            <Button variant="ghost" size="icon">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {initialPagination && initialPagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {initialPagination.page} of {initialPagination.total_pages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialPagination.page - 1)}
                      disabled={initialPagination.page <= 1 || isPending}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialPagination.page + 1)}
                      disabled={initialPagination.page >= initialPagination.total_pages || isPending}
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

