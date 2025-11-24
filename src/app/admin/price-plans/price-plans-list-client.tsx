/**
 * Price Plans List Client Component
 * 
 * Client component for displaying and managing price plans
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

interface PricePlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  trial_days: number | null;
  features: any;
  status: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  _count: {
    tenants: number;
  };
}

interface PricePlansListClientProps {
  pricePlans: PricePlan[];
}

export default function PricePlansListClient({ pricePlans }: Readonly<PricePlansListClientProps>) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this price plan? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(planId);
    try {
      const response = await fetch(`/api/admin/price-plans/${planId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete price plan');
        setIsDeleting(null);
      }
    } catch (error) {
      console.error('Error deleting price plan:', error);
      alert('An error occurred while deleting the price plan');
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(price));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Price Plans</CardTitle>
            <CardDescription>
              {pricePlans.length} plan{pricePlans.length !== 1 ? 's' : ''} available
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/price-plans/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Plan
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pricePlans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No price plans found</p>
            <Button asChild>
              <Link href="/admin/price-plans/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Your First Plan
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Trial Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenants</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricePlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{formatPrice(plan.price)}</TableCell>
                  <TableCell>
                    {plan.duration_months === 1
                      ? '1 month'
                      : `${plan.duration_months} months`}
                  </TableCell>
                  <TableCell>
                    {plan.trial_days && plan.trial_days > 0 ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {plan.trial_days} days
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No trial</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(plan.status)}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {plan._count.tenants} tenant{plan._count.tenants !== 1 ? 's' : ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    {plan.created_at
                      ? new Date(plan.created_at).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Edit Plan"
                      >
                        <Link href={`/admin/price-plans/${plan.id}`}>
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan.id)}
                        disabled={isDeleting === plan.id}
                        title="Delete Plan"
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

