import { prisma } from '@/lib/prisma/client';
import { customerUpdateSchema } from '@/lib/customers/validation';
import type { z } from 'zod';

export class CustomerAdminError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'CustomerAdminError';
  }
}

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export async function updateCustomerForTenant(
  tenantId: string,
  customerId: string,
  input: CustomerUpdateInput,
) {
  const validatedData = customerUpdateSchema.parse(input);

  const existingCustomer = await prisma.customers.findFirst({
    where: { id: customerId, tenant_id: tenantId },
  });

  if (!existingCustomer) {
    throw new CustomerAdminError('Customer not found', 404);
  }

  return prisma.customers.update({
    where: { id: customerId },
    data: validatedData,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      mobile: true,
      company: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postal_code: true,
      image: true,
      email_verified: true,
      updated_at: true,
    },
  });
}

export async function deleteCustomerForTenant(tenantId: string, customerId: string) {
  const customer = await prisma.customers.findFirst({
    where: { id: customerId, tenant_id: tenantId },
  });

  if (!customer) {
    throw new CustomerAdminError('Customer not found', 404);
  }

  await prisma.customers.delete({ where: { id: customerId } });
}

export type CustomerExportFilters = {
  search?: string;
  email?: string;
};

export async function buildCustomersExportCsv(tenantId: string, filters: CustomerExportFilters) {
  const where: {
    tenant_id: string;
    email?: { contains: string; mode: 'insensitive' };
    OR?: Array<Record<string, unknown>>;
  } = { tenant_id: tenantId };

  if (filters.email?.trim()) {
    where.email = { contains: filters.email.trim(), mode: 'insensitive' };
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { username: { contains: term, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.customers.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      mobile: true,
      company: true,
      email_verified: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });

  const customersWithStats = await Promise.all(
    customers.map(async (customer) => {
      const [orderCount, paidOrders] = await Promise.all([
        prisma.orders.count({
          where: { tenant_id: tenantId, email: customer.email },
        }),
        prisma.orders.findMany({
          where: { tenant_id: tenantId, email: customer.email, payment_status: 'paid' },
          select: { total_amount: true },
        }),
      ]);

      const totalSpent = paidOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

      return { ...customer, order_count: orderCount, total_spent: totalSpent };
    }),
  );

  const headers = [
    'ID',
    'Name',
    'Email',
    'Username',
    'Mobile',
    'Company',
    'Email Verified',
    'Total Orders',
    'Total Spent',
    'Created At',
  ];

  const rows = customersWithStats.map((customer) => [
    customer.id,
    customer.name,
    customer.email,
    customer.username || '',
    customer.mobile || '',
    customer.company || '',
    customer.email_verified ? 'Yes' : 'No',
    customer.order_count.toString(),
    customer.total_spent.toFixed(2),
    customer.created_at?.toISOString() || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');

  const filename = `customers-${new Date().toISOString().split('T')[0]}.csv`;

  return { csvContent, filename, rowCount: customersWithStats.length };
}
