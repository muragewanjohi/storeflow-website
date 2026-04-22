import { prisma } from '@/lib/prisma/client';

export type PnlSummary = {
  grossRevenue: number;
  refundsDiscounts: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
};

export function calculateMargins(netRevenue: number, grossProfit: number, netProfit: number) {
  const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
  return { grossMarginPercent, netMarginPercent };
}

export async function getPnlSummary(tenantId: string, startDate: Date, endDate: Date): Promise<PnlSummary> {
  const [ordersAgg, cogsAgg, expenseAgg] = await Promise.all([
    prisma.orders.aggregate({
      where: {
        tenant_id: tenantId,
        created_at: { gte: startDate, lte: endDate },
      },
      _sum: {
        total_amount: true,
        coupon_discounted: true,
      },
    }),
    prisma.order_products.aggregate({
      where: {
        tenant_id: tenantId,
        orders: {
          created_at: { gte: startDate, lte: endDate },
        },
      },
      _sum: {
        cogs_total: true,
      },
    }),
    prisma.expenses.aggregate({
      where: {
        tenant_id: tenantId,
        expense_date: { gte: startDate, lte: endDate },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const grossRevenue = Number(ordersAgg._sum.total_amount || 0);
  const refundsDiscounts = Number(ordersAgg._sum.coupon_discounted || 0);
  const netRevenue = Math.max(grossRevenue - refundsDiscounts, 0);
  const cogs = Number(cogsAgg._sum.cogs_total || 0);
  const grossProfit = netRevenue - cogs;
  const operatingExpenses = Number(expenseAgg._sum.amount || 0);
  const netProfit = grossProfit - operatingExpenses;
  const margins = calculateMargins(netRevenue, grossProfit, netProfit);

  return {
    grossRevenue,
    refundsDiscounts,
    netRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit,
    grossMarginPercent: margins.grossMarginPercent,
    netMarginPercent: margins.netMarginPercent,
  };
}
