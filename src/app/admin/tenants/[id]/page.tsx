/**
 * Tenant Settings Page
 * 
 * Allows landlord to edit tenant settings, change subdomain, manage custom domain,
 * suspend/activate tenant, and delete tenant
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import TenantSettingsClient from './tenant-settings-client';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantSettingsPage({ params }: PageProps) {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const { id } = await params;

  // Fetch tenant with related data
  const tenant = await prisma.tenants.findUnique({
    where: { id },
    include: {
      price_plans: {
        select: {
          id: true,
          name: true,
          price: true,
          duration_months: true,
        },
      },
    },
  });

  if (!tenant) {
    redirect('/admin/tenants');
  }

  const contactPhoneOption = await prisma.static_options.findUnique({
    where: {
      tenant_id_option_name: {
        tenant_id: tenant.id,
        option_name: 'store_phone',
      },
    },
    select: {
      option_value: true,
    },
  });

  // Include data field for reminder tracking
  const tenantData = {
    ...tenant,
    price_plans: tenant.price_plans
      ? {
          ...tenant.price_plans,
          price: Number(tenant.price_plans.price),
        }
      : null,
  };

  // Fetch countries for tenant country dropdown (global countries with ISO codes)
  let countries: Array<{ id: string; name: string; code: string | null }> = [];
  try {
    countries = await prisma.countries.findMany({
      where: {
        tenant_id: null,
        code: { not: null },
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
  }

  // Fetch all available price plans for plan selection
  const pricePlansData = await prisma.price_plans.findMany({
    where: {
      status: 'active',
    },
    orderBy: {
      price: 'asc',
    },
    select: {
      id: true,
      name: true,
      price: true,
      duration_months: true,
      features: true,
    },
  });

  // Convert Prisma Decimal to number for client component
  const pricePlans = pricePlansData.map((plan: any) => ({
    ...plan,
    price: Number(plan.price),
  }));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link 
          href="/admin/tenants" 
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <HomeIcon className="h-4 w-4" />
          <span>Tenants</span>
        </Link>
        <ChevronRightIcon className="h-4 w-4" />
        <span className="text-foreground font-medium">{tenant.name}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tenant Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage settings for {tenant.name}
        </p>
      </div>
      <TenantSettingsClient
        tenant={tenantData as any}
        pricePlans={pricePlans}
        countries={countries}
        contactPhone={contactPhoneOption?.option_value || ''}
      />
    </div>
  );
}

