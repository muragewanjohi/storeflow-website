/**
 * Edit Price Plan Page
 * 
 * Page for editing an existing price plan
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import EditPlanForm from './edit-plan-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPricePlanPage({ params }: Readonly<PageProps>) {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const { id } = await params;

  // Fetch the price plan
  const pricePlanData = await prisma.price_plans.findUnique({
    where: { id },
  });

  if (!pricePlanData) {
    redirect('/admin/price-plans');
  }

  // Convert Prisma Decimal to number for client component
  const pricePlan = {
    ...pricePlanData,
    price: Number(pricePlanData.price),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Price Plan</h1>
        <p className="text-muted-foreground mt-2">
          Update subscription plan details
        </p>
      </div>
      <EditPlanForm pricePlan={pricePlan} />
    </div>
  );
}

