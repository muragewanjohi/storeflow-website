/**
 * Price Plans List Page
 * 
 * Displays all price plans for the landlord admin
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import PricePlansListClient from './price-plans-list-client';

export default async function PricePlansPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all price plans
  const pricePlansData = await prisma.price_plans.findMany({
    orderBy: {
      price: 'asc',
    },
    select: {
      id: true,
      name: true,
      price: true,
      duration_months: true,
      trial_days: true,
      features: true,
      status: true,
      created_at: true,
      updated_at: true,
      _count: {
        select: {
          tenants: true,
        },
      },
    },
  });

  // Convert Prisma Decimal to number for client component
  const pricePlans = pricePlansData.map((plan) => ({
    ...plan,
    price: Number(plan.price),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Price Plans</h1>
        <p className="text-muted-foreground mt-2">
          Manage subscription plans and pricing tiers
        </p>
      </div>
      <PricePlansListClient pricePlans={pricePlans} />
    </div>
  );
}

