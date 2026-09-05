import { cache, cacheKeys } from '@/lib/cache/simple-cache';
import { prisma } from '@/lib/prisma/client';
import { getParam, parseDateRange } from '@/lib/analytics/query-params';

export type AnalyticsHandler = (
  tenantId: string,
  searchParams: URLSearchParams,
) => Promise<unknown>;

export type AnalyticsOverviewData = {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
  };
  thisMonth: {
    orders: number;
    revenue: number;
    newCustomers: number;
  };
  pendingOrders: number;
  visitorsToday: number;
};

export async function getAnalyticsOverview(
  tenantId: string,
  _searchParams: URLSearchParams,
): Promise<AnalyticsOverviewData> {
  const cacheKey = cacheKeys.analyticsOverview(tenantId);
  const cached = cache.get<AnalyticsOverviewData>(cacheKey);
  if (cached) {
    return cached;
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [stats] = await prisma.$queryRaw<
    Array<{
      total_orders: bigint;
      total_revenue: number | null;
      total_customers: bigint;
      total_products: bigint;
      orders_this_month: bigint;
      revenue_this_month: number | null;
      new_customers_this_month: bigint;
      pending_orders: bigint;
    }>
  >`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenantId}::uuid) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE tenant_id = ${tenantId}::uuid AND payment_status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = ${tenantId}::uuid) as total_customers,
        (SELECT COUNT(*) FROM products WHERE tenant_id = ${tenantId}::uuid AND status = 'active') as total_products,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${monthStart}) as orders_this_month,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE tenant_id = ${tenantId}::uuid AND payment_status = 'paid' AND created_at >= ${monthStart}) as revenue_this_month,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${monthStart}) as new_customers_this_month,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenantId}::uuid AND status IN ('pending', 'processing')) as pending_orders
    `;

  let visitorsToday = 0;
  try {
    const [visitorsResult] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT session_id)::bigint as count
        FROM analytics_sessions
        WHERE tenant_id = ${tenantId}::uuid
          AND started_at >= ${todayStart}
      `;
    visitorsToday = Number(visitorsResult?.count ?? 0);
  } catch {
    // analytics_sessions table may not exist
  }

  const data: AnalyticsOverviewData = {
    overview: {
      totalOrders: Number(stats.total_orders),
      totalRevenue: Number(stats.total_revenue || 0),
      totalCustomers: Number(stats.total_customers),
      totalProducts: Number(stats.total_products),
    },
    thisMonth: {
      orders: Number(stats.orders_this_month),
      revenue: Number(stats.revenue_this_month || 0),
      newCustomers: Number(stats.new_customers_this_month),
    },
    pendingOrders: Number(stats.pending_orders),
    visitorsToday,
  };

  cache.set(cacheKey, data, 30);
  return data;
}

export async function getAnalyticsRevenue(tenantId: string, searchParams: URLSearchParams) {
  const { startDate, endDate } = parseDateRange(searchParams, { endOfDay: true });
  const groupBy = getParam(searchParams, 'groupBy', 'group_by') || 'day';

  const orders = await prisma.orders.findMany({
    where: {
      tenant_id: tenantId,
      payment_status: 'paid',
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      total_amount: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  const revenueByPeriod: Record<string, number> = {};

  orders.forEach((order: { created_at: Date | null; total_amount: unknown }) => {
    const date = new Date(order.created_at!);
    let key: string;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    revenueByPeriod[key] = (revenueByPeriod[key] || 0) + Number(order.total_amount);
  });

  const revenueTrends = Object.entries(revenueByPeriod)
    .map(([date, revenue]) => ({
      date,
      revenue,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalRevenue = orders.reduce(
    (sum: number, order: { total_amount: unknown }) => sum + Number(order.total_amount),
    0,
  );
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  return {
    totalRevenue,
    averageOrderValue,
    trends: revenueTrends,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy,
    },
  };
}

export async function getAnalyticsSales(tenantId: string, searchParams: URLSearchParams) {
  const { startDate, endDate } = parseDateRange(searchParams, { endOfDay: true });

  const orderProducts = await prisma.order_products.findMany({
    where: {
      tenant_id: tenantId,
      orders: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        payment_status: 'paid',
      },
    },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          category_id: true,
        },
      },
    },
  });

  const salesByProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};

  orderProducts.forEach((op) => {
    if (!op.products) return;

    const productId = op.product_id || 'unknown';
    const productName = op.products.name || 'Unknown Product';

    if (!salesByProduct[productId]) {
      salesByProduct[productId] = {
        name: productName,
        quantity: 0,
        revenue: 0,
      };
    }

    salesByProduct[productId].quantity += op.quantity;
    salesByProduct[productId].revenue += Number(op.total);
  });

  const categoryIds = [
    ...new Set(
      orderProducts.map((op) => op.products?.category_id).filter(Boolean),
    ),
  ] as string[];
  const categories =
    categoryIds.length > 0
      ? await prisma.categories.findMany({
          where: {
            id: { in: categoryIds },
            tenant_id: tenantId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

  const salesByCategory: Record<string, { name: string; quantity: number; revenue: number }> = {};

  orderProducts.forEach((op) => {
    if (!op.products?.category_id) return;

    const categoryId = op.products.category_id;
    const categoryName = categoryMap.get(categoryId) || 'Uncategorized';

    if (!salesByCategory[categoryId]) {
      salesByCategory[categoryId] = {
        name: categoryName,
        quantity: 0,
        revenue: 0,
      };
    }

    salesByCategory[categoryId].quantity += op.quantity;
    salesByCategory[categoryId].revenue += Number(op.total);
  });

  const topProducts = Object.entries(salesByProduct)
    .map(([id, data]) => ({
      id,
      ...data,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const topCategories = Object.entries(salesByCategory)
    .map(([id, data]) => ({
      id,
      ...data,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalSales = orderProducts.reduce((sum, op) => sum + op.quantity, 0);
  const totalRevenue = orderProducts.reduce((sum, op) => sum + Number(op.total), 0);

  return {
    totalSales,
    totalRevenue,
    byProduct: topProducts,
    byCategory: topCategories,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  };
}

export async function getAnalyticsCustomers(tenantId: string, searchParams: URLSearchParams) {
  const { startDate, endDate } = parseDateRange(searchParams);

  const [
    totalCustomers,
    newCustomers,
    customersWithOrders,
    customerAcquisitionTrend,
    topCustomers,
    customerLifetimeValue,
  ] = await Promise.all([
    prisma.customers.count({
      where: {
        tenant_id: tenantId,
      },
    }),
    prisma.customers.count({
      where: {
        tenant_id: tenantId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.orders
      .findMany({
        where: {
          tenant_id: tenantId,
          user_id: { not: null },
        },
        select: {
          user_id: true,
        },
        distinct: ['user_id'],
      })
      .then((orders) => orders.length),
    prisma.customers.findMany({
      where: {
        tenant_id: tenantId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    }),
    prisma.orders
      .findMany({
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          user_id: { not: null },
        },
        select: {
          user_id: true,
          total_amount: true,
        },
      })
      .then(async (orders) => {
        const customerMap = new Map<string, { totalRevenue: number; orderCount: number }>();
        orders.forEach((order) => {
          if (!order.user_id) return;
          const existing = customerMap.get(order.user_id) || { totalRevenue: 0, orderCount: 0 };
          customerMap.set(order.user_id, {
            totalRevenue: existing.totalRevenue + Number(order.total_amount),
            orderCount: existing.orderCount + 1,
          });
        });

        const topCustomerIds = Array.from(customerMap.entries())
          .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
          .slice(0, 10)
          .map(([id]) => id);

        const customers = await prisma.customers.findMany({
          where: {
            id: { in: topCustomerIds },
            tenant_id: tenantId,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        return customers.map((customer) => {
          const stats = customerMap.get(customer.id)!;
          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            orders: Array(stats.orderCount).fill({ total_amount: 0 }),
            _totalRevenue: stats.totalRevenue,
            _orderCount: stats.orderCount,
          };
        });
      }),
    prisma.orders.aggregate({
      where: {
        tenant_id: tenantId,
        payment_status: 'paid',
        user_id: { not: null },
      },
      _avg: {
        total_amount: true,
      },
      _sum: {
        total_amount: true,
      },
    }),
  ]);

  const acquisitionByPeriod: Record<string, number> = {};
  customerAcquisitionTrend.forEach((customer) => {
    const date = new Date(customer.created_at!);
    const key = date.toISOString().split('T')[0];
    acquisitionByPeriod[key] = (acquisitionByPeriod[key] || 0) + 1;
  });

  const acquisitionTrend = Object.entries(acquisitionByPeriod)
    .map(([date, count]) => ({
      date,
      count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topCustomersData = topCustomers
    .map((customer: {
      id: string;
      name: string | null;
      email: string | null;
      _totalRevenue?: number;
      _orderCount?: number;
    }) => {
      const totalRevenue = customer._totalRevenue || 0;
      const orderCount = customer._orderCount || 0;
      return {
        id: customer.id,
        name: customer.name || customer.email,
        email: customer.email,
        totalRevenue,
        orderCount,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  const avgOrderValue = Number(customerLifetimeValue._avg.total_amount || 0);
  const totalRevenue = Number(customerLifetimeValue._sum.total_amount || 0);
  const avgLifetimeValue = customersWithOrders > 0 ? totalRevenue / customersWithOrders : 0;
  const conversionRate = totalCustomers > 0 ? (customersWithOrders / totalCustomers) * 100 : 0;

  let customersByCountry: Array<{ country: string; count: number }> = [];
  try {
    const countryData = await prisma.$queryRaw<Array<{ country_code: string | null; count: bigint }>>`
        SELECT 
          COALESCE(country_code, 'Unknown') as country_code,
          COUNT(*)::bigint as count
        FROM customers
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY country_code
        ORDER BY count DESC
        LIMIT 10
      `;

    customersByCountry = countryData.map((item) => ({
      country: item.country_code || 'Unknown',
      count: Number(item.count),
    }));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === '42703' ||
      err?.message?.includes('column') ||
      err?.message?.includes('country_code')
    ) {
      console.warn('Country code column not found in customers table. Run the migration to add it.');
      customersByCountry = [];
    } else {
      throw error;
    }
  }

  return {
    totalCustomers,
    newCustomers,
    customersWithOrders,
    conversionRate: Number(conversionRate.toFixed(2)),
    acquisitionTrend,
    topCustomers: topCustomersData,
    customersByCountry,
    lifetimeValue: {
      average: avgLifetimeValue,
      averageOrderValue: avgOrderValue,
    },
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  };
}

export async function getAnalyticsInventory(tenantId: string, searchParams: URLSearchParams) {
  const lowStockThreshold = parseInt(
    getParam(searchParams, 'lowStockThreshold', 'low_stock_threshold') || '10',
  );

  const [
    totalProducts,
    totalVariants,
    lowStockProducts,
    lowStockVariants,
    outOfStockProducts,
    outOfStockVariants,
    inventoryValue,
    inventoryByCategory,
  ] = await Promise.all([
    prisma.products.count({
      where: {
        tenant_id: tenantId,
        status: 'active',
      },
    }),
    prisma.product_variants.count({
      where: {
        tenant_id: tenantId,
      },
    }),
    prisma.products.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
        stock_quantity: {
          lte: lowStockThreshold,
          gte: 1,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock_quantity: true,
        image: true,
        price: true,
        category_id: true,
      },
      orderBy: {
        stock_quantity: 'asc',
      },
    }),
    prisma.product_variants.findMany({
      where: {
        tenant_id: tenantId,
        stock_quantity: {
          lte: lowStockThreshold,
          gte: 1,
        },
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: {
        stock_quantity: 'asc',
      },
    }),
    prisma.products.count({
      where: {
        tenant_id: tenantId,
        status: 'active',
        OR: [{ stock_quantity: 0 }, { stock_quantity: null }],
      },
    }),
    prisma.product_variants.count({
      where: {
        tenant_id: tenantId,
        OR: [{ stock_quantity: 0 }, { stock_quantity: null }],
      },
    }),
    prisma.products.aggregate({
      where: {
        tenant_id: tenantId,
        status: 'active',
        stock_quantity: { not: null },
      },
      _sum: {
        stock_quantity: true,
      },
    }),
    prisma.products.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
        category_id: { not: null },
      },
      select: {
        category_id: true,
        stock_quantity: true,
        price: true,
      },
    }),
  ]);

  const products = await prisma.products.findMany({
    where: {
      tenant_id: tenantId,
      status: 'active',
      stock_quantity: { not: null },
    },
    select: {
      stock_quantity: true,
      price: true,
    },
  });

  const totalInventoryValue = products.reduce((sum, product) => {
    const quantity = product.stock_quantity || 0;
    const price = Number(product.price);
    return sum + quantity * price;
  }, 0);

  const categoryIds = [
    ...new Set(inventoryByCategory.map((p) => p.category_id).filter(Boolean)),
  ] as string[];
  const categories =
    categoryIds.length > 0
      ? await prisma.categories.findMany({
          where: {
            id: { in: categoryIds },
            tenant_id: tenantId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

  const inventoryByCategoryMap: Record<string, { name: string; quantity: number; value: number }> =
    {};

  inventoryByCategory.forEach((product) => {
    if (!product.category_id) return;

    const categoryId = product.category_id;
    const categoryName = categoryMap.get(categoryId) || 'Uncategorized';
    const quantity = product.stock_quantity || 0;
    const value = quantity * Number(product.price);

    if (!inventoryByCategoryMap[categoryId]) {
      inventoryByCategoryMap[categoryId] = {
        name: categoryName,
        quantity: 0,
        value: 0,
      };
    }

    inventoryByCategoryMap[categoryId].quantity += quantity;
    inventoryByCategoryMap[categoryId].value += value;
  });

  const inventoryByCategoryData = Object.entries(inventoryByCategoryMap)
    .map(([id, data]) => ({
      id,
      ...data,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    summary: {
      totalProducts,
      totalVariants,
      lowStockCount: lowStockProducts.length + lowStockVariants.length,
      outOfStockCount: outOfStockProducts + outOfStockVariants,
      totalInventoryValue,
    },
    lowStock: {
      products: lowStockProducts.map((p) => ({
        ...p,
        price: Number(p.price),
      })),
      variants: lowStockVariants.map((v) => ({
        id: v.id,
        productId: v.product_id,
        productName: v.products?.name || 'Unknown',
        productSku: v.products?.sku,
        variantSku: v.sku,
        stockQuantity: v.stock_quantity,
      })),
    },
    outOfStock: {
      products: outOfStockProducts,
      variants: outOfStockVariants,
    },
    byCategory: inventoryByCategoryData,
    threshold: lowStockThreshold,
  };
}

export async function getAnalyticsGeographic(tenantId: string, searchParams: URLSearchParams) {
  const { startDate, endDate } = parseDateRange(searchParams);

  const orders = await prisma.orders.findMany({
    where: {
      tenant_id: tenantId,
      payment_status: 'paid',
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      total_amount: true,
      shipping_address: true,
      billing_address: true,
    },
  });

  const byCountry: Record<string, { country: string; revenue: number; orders: number }> = {};
  const byState: Record<string, { state: string; country: string; revenue: number; orders: number }> =
    {};
  const byCity: Record<
    string,
    { city: string; state: string; country: string; revenue: number; orders: number }
  > = {};

  orders.forEach((order) => {
    const address = (order.shipping_address || order.billing_address || {}) as {
      country?: string;
      state?: string;
      region?: string;
      city?: string;
    };
    const country = address.country || 'Unknown';
    const state = address.state || address.region || 'Unknown';
    const city = address.city || 'Unknown';
    const revenue = Number(order.total_amount);

    if (!byCountry[country]) {
      byCountry[country] = { country, revenue: 0, orders: 0 };
    }
    byCountry[country].revenue += revenue;
    byCountry[country].orders += 1;

    const stateKey = `${country}-${state}`;
    if (!byState[stateKey]) {
      byState[stateKey] = { state, country, revenue: 0, orders: 0 };
    }
    byState[stateKey].revenue += revenue;
    byState[stateKey].orders += 1;

    const cityKey = `${country}-${state}-${city}`;
    if (!byCity[cityKey]) {
      byCity[cityKey] = { city, state, country, revenue: 0, orders: 0 };
    }
    byCity[cityKey].revenue += revenue;
    byCity[cityKey].orders += 1;
  });

  const countries = Object.values(byCountry)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  const states = Object.values(byState)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  const cities = Object.values(byCity)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  return {
    byCountry: countries,
    byState: states,
    byCity: cities,
    totalCountries: countries.length,
    totalStates: states.length,
    totalCities: cities.length,
  };
}

export async function getAnalyticsConversionFunnel(tenantId: string, searchParams: URLSearchParams) {
  const { startDate, endDate } = parseDateRange(searchParams, { endOfDay: true });

  let visitors = 0;
  let addToCart = 0;
  let checkoutStarted = 0;
  let completedOrders = 0;

  const [paidOrders, allOrders] = await Promise.all([
    prisma.orders.count({
      where: {
        tenant_id: tenantId,
        payment_status: 'paid',
        created_at: { gte: startDate, lte: endDate },
      },
    }),
    prisma.orders.count({
      where: {
        tenant_id: tenantId,
        created_at: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  completedOrders = paidOrders;
  checkoutStarted = allOrders;

  try {
    const [sessionsData, addToCartData, checkoutStartData, checkoutCompleteData] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_sessions
          WHERE tenant_id = ${tenantId}::uuid
            AND started_at >= ${startDate}
            AND started_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenantId}::uuid
            AND event_name = 'add_to_cart'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenantId}::uuid
            AND event_name = 'checkout_start'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenantId}::uuid
            AND event_name = 'checkout_complete'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
    ]);

    const trackedVisitors = Number(sessionsData[0]?.count || 0);
    const trackedAddToCart = Number(addToCartData[0]?.count || 0);
    const trackedCheckoutStart = Number(checkoutStartData[0]?.count || 0);
    const trackedCompletedOrders = Number(checkoutCompleteData[0]?.count || 0);

    visitors = trackedVisitors > 0 ? trackedVisitors : Math.max(allOrders * 10, 0);
    addToCart = Math.max(trackedAddToCart, allOrders);
    checkoutStarted = Math.max(trackedCheckoutStart, allOrders);
    completedOrders = Math.max(trackedCompletedOrders, paidOrders);
  } catch (error) {
    console.warn('Analytics tables not available, using estimates:', error);
    addToCart = allOrders;
    visitors = Math.max(allOrders * 10, 0);
  }

  const addToCartRate = visitors > 0 ? (addToCart / visitors) * 100 : 0;
  const checkoutRate = visitors > 0 ? (checkoutStarted / visitors) * 100 : 0;
  const conversionRate = visitors > 0 ? (completedOrders / visitors) * 100 : 0;
  const cartAbandonmentRate = addToCart > 0 ? ((addToCart - checkoutStarted) / addToCart) * 100 : 0;
  const checkoutAbandonmentRate =
    checkoutStarted > 0 ? ((checkoutStarted - completedOrders) / checkoutStarted) * 100 : 0;

  return {
    funnel: {
      visitors,
      addToCart,
      checkoutStarted,
      ordersCompleted: completedOrders,
    },
    rates: {
      addToCartRate: Number(addToCartRate.toFixed(2)),
      checkoutRate: Number(checkoutRate.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      cartAbandonmentRate: Number(cartAbandonmentRate.toFixed(2)),
      checkoutAbandonmentRate: Number(checkoutAbandonmentRate.toFixed(2)),
    },
    note: 'Visitor estimates are based on order data. For accurate metrics, implement session tracking.',
  };
}

export async function getAnalyticsProductPerformance(
  tenantId: string,
  searchParams: URLSearchParams,
) {
  const { startDate, endDate } = parseDateRange(searchParams);

  const products = await prisma.products.findMany({
    where: {
      tenant_id: tenantId,
      status: 'active',
    },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      status: true,
      created_at: true,
    },
  });

  const orderProducts = await prisma.order_products.findMany({
    where: {
      tenant_id: tenantId,
      orders: {
        payment_status: 'paid',
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      orders: {
        select: {
          created_at: true,
        },
      },
    },
  });

  const productViewsMap = new Map<string, number>();
  try {
    const productIds = products.map((p) => p.id);
    if (productIds.length > 0) {
      const viewsData = await prisma.$queryRaw<Array<{ product_id: string; count: bigint }>>`
          SELECT 
            product_id,
            COUNT(*)::bigint as count
          FROM analytics_page_views
          WHERE tenant_id = ${tenantId}::uuid
            AND product_id = ANY(${productIds}::uuid[])
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY product_id
        `;
      viewsData.forEach((row) => {
        productViewsMap.set(row.product_id, Number(row.count));
      });
    }
  } catch {
    // Analytics tables not available, will use estimates
  }

  const productPerformance = products.map((product) => {
    const productOrders = orderProducts.filter((op) => op.product_id === product.id);

    const totalSold = productOrders.reduce((sum, op) => sum + op.quantity, 0);
    const totalRevenue = productOrders.reduce((sum, op) => sum + Number(op.total), 0);
    const orderCount = productOrders.length;

    let productViews = productViewsMap.get(product.id) || 0;
    if (productViews === 0 && totalSold > 0) {
      productViews = Math.round(totalSold / 0.03);
    }

    const conversionRate = productViews > 0 ? (totalSold / productViews) * 100 : 0;

    const performanceByWeek: Record<string, { week: string; sold: number; revenue: number }> = {};

    productOrders.forEach((op) => {
      const orderDate = new Date(op.orders.created_at!);
      const weekStart = new Date(orderDate);
      weekStart.setDate(orderDate.getDate() - orderDate.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!performanceByWeek[weekKey]) {
        performanceByWeek[weekKey] = {
          week: weekKey,
          sold: 0,
          revenue: 0,
        };
      }
      performanceByWeek[weekKey].sold += op.quantity;
      performanceByWeek[weekKey].revenue += Number(op.total);
    });

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      totalSold,
      totalRevenue,
      orderCount,
      estimatedViews: productViews,
      productViews,
      conversionRate: Number(conversionRate.toFixed(2)),
      performanceOverTime: Object.values(performanceByWeek).sort(
        (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
      ),
    };
  });

  const sortedByRevenue = [...productPerformance].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const sortedByUnits = [...productPerformance].sort((a, b) => b.totalSold - a.totalSold);
  const sortedByConversion = [...productPerformance].sort(
    (a, b) => b.conversionRate - a.conversionRate,
  );

  return {
    products: productPerformance,
    bestByRevenue: sortedByRevenue.slice(0, 10),
    bestByUnits: sortedByUnits.slice(0, 10),
    bestByConversion: sortedByConversion.slice(0, 10),
    worstPerformers: sortedByRevenue.slice(-10).reverse(),
    totalProducts: products.length,
    productsWithSales: productPerformance.filter((p) => p.totalSold > 0).length,
    note:
      productViewsMap.size > 0
        ? 'Product views are tracked from analytics data.'
        : 'Product views are estimated. Page view tracking is active and will provide accurate metrics once data is collected.',
  };
}

export async function getAnalyticsRefunds(tenantId: string, searchParams: URLSearchParams) {
  const { startDate, endDate } = parseDateRange(searchParams);

  const allOrders = await prisma.orders.findMany({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      total_amount: true,
      payment_status: true,
      status: true,
      created_at: true,
    },
  });

  const refundedOrders = allOrders.filter(
    (order) =>
      order.status === 'refunded' ||
      order.payment_status === 'refunded' ||
      order.payment_status === 'partially_refunded',
  );

  const totalOrders = allOrders.length;
  const refundedCount = refundedOrders.length;
  const totalRevenue = allOrders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const refundedAmount = refundedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const refundRate = totalOrders > 0 ? (refundedCount / totalOrders) * 100 : 0;

  const refundTrends: Record<string, { week: string; count: number; amount: number }> = {};

  refundedOrders.forEach((order) => {
    const orderDate = new Date(order.created_at!);
    const weekStart = new Date(orderDate);
    weekStart.setDate(orderDate.getDate() - orderDate.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!refundTrends[weekKey]) {
      refundTrends[weekKey] = {
        week: weekKey,
        count: 0,
        amount: 0,
      };
    }
    refundTrends[weekKey].count += 1;
    refundTrends[weekKey].amount += Number(order.total_amount);
  });

  return {
    summary: {
      totalOrders,
      refundedOrders: refundedCount,
      totalRevenue,
      refundedAmount,
      refundRate: Number(refundRate.toFixed(2)),
      netRevenue: totalRevenue - refundedAmount,
    },
    trends: Object.values(refundTrends).sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
    ),
    note: 'Returns tracking requires order status management. Ensure refunded orders are properly marked.',
  };
}

export async function getAnalyticsRealtime(tenantId: string, _searchParams: URLSearchParams) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
  const last15Minutes = new Date(Date.now() - 15 * 60 * 1000);

  const [recentOrders, hourlyOrders, todayRevenue, todayOrders, liveVisitors, recentVisitors] =
    await Promise.all([
      prisma.orders.findMany({
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: last24Hours,
          },
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          payment_status: true,
          created_at: true,
          name: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 10,
      }),
      prisma.orders.count({
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: lastHour,
          },
        },
      }),
      prisma.orders.aggregate({
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: {
          total_amount: true,
        },
      }),
      prisma.orders.count({
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT session_id) as count
        FROM analytics_sessions
        WHERE tenant_id = ${tenantId}::uuid
          AND last_activity_at >= ${last5Minutes}
      `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT session_id) as count
        FROM analytics_sessions
        WHERE tenant_id = ${tenantId}::uuid
          AND last_activity_at >= ${last15Minutes}
      `.catch(() => [{ count: BigInt(0) }]),
    ]);

  const actualLiveVisitors = Number(liveVisitors[0]?.count || 0);
  const actualRecentVisitors = Number(recentVisitors[0]?.count || 0);

  return {
    live: {
      estimatedVisitors: actualLiveVisitors,
      recentVisitors: actualRecentVisitors,
      ordersLastHour: hourlyOrders,
      todayRevenue: Number(todayRevenue._sum.total_amount || 0),
      todayOrders: todayOrders,
    },
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.name,
      amount: Number(order.total_amount),
      status: order.payment_status,
      createdAt: order.created_at,
    })),
    timestamp: new Date().toISOString(),
  };
}

export async function getAnalyticsRealtimePoll(tenantId: string, _searchParams: URLSearchParams) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);

  let liveVisitors = 0;
  try {
    const liveSessions = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT session_id)::bigint as count
        FROM analytics_sessions
        WHERE tenant_id = ${tenantId}::uuid
          AND last_activity_at >= ${last5Minutes}
      `;
    liveVisitors = Number(liveSessions[0]?.count || 0);
  } catch {
    const hourlyOrders = await prisma.orders.count({
      where: {
        tenant_id: tenantId,
        created_at: { gte: lastHour },
      },
    });
    liveVisitors = Math.max(hourlyOrders * 5, 0);
  }

  const [hourlyOrders, todayRevenue, todayOrders, recentOrders] = await Promise.all([
    prisma.orders.count({
      where: {
        tenant_id: tenantId,
        created_at: { gte: lastHour },
      },
    }),
    prisma.orders.aggregate({
      where: {
        tenant_id: tenantId,
        payment_status: 'paid',
        created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { total_amount: true },
    }),
    prisma.orders.count({
      where: {
        tenant_id: tenantId,
        created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.orders.findMany({
      where: {
        tenant_id: tenantId,
        created_at: { gte: last24Hours },
      },
      select: {
        id: true,
        order_number: true,
        total_amount: true,
        payment_status: true,
        created_at: true,
        name: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
  ]);

  return {
    live: {
      estimatedVisitors: liveVisitors,
      ordersLastHour: hourlyOrders,
      todayRevenue: Number(todayRevenue._sum.total_amount || 0),
      todayOrders: todayOrders,
    },
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.name,
      amount: Number(order.total_amount),
      status: order.payment_status,
      createdAt: order.created_at,
    })),
    timestamp: new Date().toISOString(),
  };
}

export async function getAnalyticsCompare(tenantId: string, searchParams: URLSearchParams) {
  const startDate1Raw = getParam(searchParams, 'startDate1', 'start_date1');
  const endDate1Raw = getParam(searchParams, 'endDate1', 'end_date1');

  const startDate1 = startDate1Raw
    ? new Date(startDate1Raw)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate1 = endDate1Raw ? new Date(endDate1Raw) : new Date();

  const periodLength = endDate1.getTime() - startDate1.getTime();
  const startDate2 = new Date(startDate1.getTime() - periodLength);
  const endDate2 = new Date(startDate1);

  const [period1Data, period2Data] = await Promise.all([
    Promise.all([
      prisma.orders.aggregate({
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          created_at: { gte: startDate1, lte: endDate1 },
        },
        _sum: { total_amount: true },
        _count: true,
      }),
      prisma.customers.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startDate1, lte: endDate1 },
        },
      }),
    ]),
    Promise.all([
      prisma.orders.aggregate({
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          created_at: { gte: startDate2, lte: endDate2 },
        },
        _sum: { total_amount: true },
        _count: true,
      }),
      prisma.customers.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startDate2, lte: endDate2 },
        },
      }),
    ]),
  ]);

  const period1 = {
    revenue: Number(period1Data[0]._sum.total_amount || 0),
    orders: period1Data[0]._count,
    customers: period1Data[1],
    averageOrderValue:
      period1Data[0]._count > 0
        ? Number(period1Data[0]._sum.total_amount || 0) / period1Data[0]._count
        : 0,
  };

  const period2 = {
    revenue: Number(period2Data[0]._sum.total_amount || 0),
    orders: period2Data[0]._count,
    customers: period2Data[1],
    averageOrderValue:
      period2Data[0]._count > 0
        ? Number(period2Data[0]._sum.total_amount || 0) / period2Data[0]._count
        : 0,
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const growth = {
    revenue: calculateGrowth(period1.revenue, period2.revenue),
    orders: calculateGrowth(period1.orders, period2.orders),
    customers: calculateGrowth(period1.customers, period2.customers),
    averageOrderValue: calculateGrowth(period1.averageOrderValue, period2.averageOrderValue),
  };

  return {
    period1: {
      ...period1,
      startDate: startDate1.toISOString(),
      endDate: endDate1.toISOString(),
    },
    period2: {
      ...period2,
      startDate: startDate2.toISOString(),
      endDate: endDate2.toISOString(),
    },
    growth,
    trends: {
      revenue: growth.revenue >= 0 ? 'up' : 'down',
      orders: growth.orders >= 0 ? 'up' : 'down',
      customers: growth.customers >= 0 ? 'up' : 'down',
      averageOrderValue: growth.averageOrderValue >= 0 ? 'up' : 'down',
    },
  };
}

export async function getAnalyticsTrafficSources(tenantId: string, searchParams: URLSearchParams) {
  const { startDate, endDate } = parseDateRange(searchParams);

  const sessions = await prisma.$queryRaw<
    Array<{
      referrer: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      count: bigint;
    }>
  >`
      SELECT 
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*)::bigint as count
      FROM analytics_sessions
      WHERE tenant_id = ${tenantId}::uuid
        AND started_at >= ${startDate}
        AND started_at <= ${endDate}
      GROUP BY referrer, utm_source, utm_medium, utm_campaign
      ORDER BY count DESC
    `;

  const categorizeSource = (
    referrer: string | null,
    utmSource: string | null,
    utmMedium: string | null,
  ): string => {
    if (utmSource) {
      return utmSource;
    }

    if (!referrer || referrer === 'direct' || referrer === '') {
      return 'Direct';
    }

    try {
      const url = new URL(referrer);
      const hostname = url.hostname.toLowerCase();

      if (
        hostname.includes('google') ||
        hostname.includes('bing') ||
        hostname.includes('yahoo') ||
        hostname.includes('duckduckgo')
      ) {
        return 'Search';
      }

      if (
        hostname.includes('facebook') ||
        hostname.includes('twitter') ||
        hostname.includes('instagram') ||
        hostname.includes('linkedin') ||
        hostname.includes('pinterest') ||
        hostname.includes('tiktok')
      ) {
        return 'Social';
      }

      return hostname;
    } catch {
      return 'Direct';
    }
  };

  const bySource: Record<string, { source: string; sessions: number; revenue: number }> = {};
  const byMedium: Record<string, number> = {};
  const byCampaign: Record<string, number> = {};

  sessions.forEach((session) => {
    const source = categorizeSource(session.referrer, session.utm_source, session.utm_medium);
    const count = Number(session.count);

    if (!bySource[source]) {
      bySource[source] = { source, sessions: 0, revenue: 0 };
    }
    bySource[source].sessions += count;

    if (session.utm_medium) {
      byMedium[session.utm_medium] = (byMedium[session.utm_medium] || 0) + count;
    }

    if (session.utm_campaign) {
      byCampaign[session.utm_campaign] = (byCampaign[session.utm_campaign] || 0) + count;
    }
  });

  const ordersBySource = await prisma.$queryRaw<
    Array<{
      utm_source: string | null;
      referrer: string | null;
      revenue: number | null;
    }>
  >`
      SELECT 
        s.utm_source,
        s.referrer,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM analytics_sessions s
      INNER JOIN analytics_events e ON s.session_id = e.session_id AND s.tenant_id = e.tenant_id
      INNER JOIN orders o ON e.order_id = o.id AND e.tenant_id = o.tenant_id
      WHERE s.tenant_id = ${tenantId}::uuid
        AND s.started_at >= ${startDate}
        AND s.started_at <= ${endDate}
        AND e.event_name = 'checkout_complete'
        AND o.payment_status = 'paid'
      GROUP BY s.utm_source, s.referrer
    `;

  ordersBySource.forEach((order) => {
    const source = categorizeSource(order.referrer, order.utm_source, null);
    if (bySource[source]) {
      bySource[source].revenue += Number(order.revenue || 0);
    }
  });

  return {
    bySource: Object.values(bySource)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 20),
    byMedium: Object.entries(byMedium)
      .map(([medium, count]) => ({ medium, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    byCampaign: Object.entries(byCampaign)
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    totalSessions: sessions.reduce((sum, s) => sum + Number(s.count), 0),
  };
}

export async function getAnalyticsExport(tenantId: string, searchParams: URLSearchParams) {
  const format = getParam(searchParams, 'format') || 'csv';
  const type = getParam(searchParams, 'type') || 'overview';
  const { startDate, endDate } = parseDateRange(searchParams);

  let data: unknown = {};
  let filename = '';

  switch (type) {
    case 'revenue': {
      const orders = await prisma.orders.findMany({
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      data = orders.map((order) => ({
        Date: order.created_at?.toISOString().split('T')[0] || '',
        'Order Number': order.order_number,
        Amount: Number(order.total_amount),
      }));
      filename = `revenue-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;
    }

    case 'sales': {
      const orderProducts = await prisma.order_products.findMany({
        where: {
          tenant_id: tenantId,
          orders: {
            created_at: {
              gte: startDate,
              lte: endDate,
            },
            payment_status: 'paid',
          },
        },
        include: {
          products: {
            select: {
              name: true,
              sku: true,
            },
          },
          orders: {
            select: {
              order_number: true,
              created_at: true,
            },
          },
        },
      });

      data = orderProducts.map((op) => ({
        Date: op.orders?.created_at?.toISOString().split('T')[0] || '',
        'Order Number': op.orders?.order_number || '',
        Product: op.products?.name || 'Unknown',
        SKU: op.products?.sku || '',
        Quantity: op.quantity,
        'Unit Price': Number(op.price),
        Total: Number(op.total),
      }));
      filename = `sales-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;
    }

    case 'customers': {
      const customers = await prisma.customers.findMany({
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          created_at: true,
        },
      });

      const customerIds = customers.map((c) => c.id);
      const orders = await prisma.orders.findMany({
        where: {
          tenant_id: tenantId,
          user_id: { in: customerIds },
          payment_status: 'paid',
        },
        select: {
          user_id: true,
          total_amount: true,
        },
      });

      const ordersByCustomer = new Map<string, { count: number; revenue: number }>();
      orders.forEach((order) => {
        if (!order.user_id) return;
        const existing = ordersByCustomer.get(order.user_id) || { count: 0, revenue: 0 };
        ordersByCustomer.set(order.user_id, {
          count: existing.count + 1,
          revenue: existing.revenue + Number(order.total_amount),
        });
      });

      data = customers.map((customer) => {
        const orderStats = ordersByCustomer.get(customer.id) || { count: 0, revenue: 0 };
        return {
          'Registration Date': customer.created_at?.toISOString().split('T')[0] || '',
          Name: customer.name || '',
          Email: customer.email,
          'Total Orders': orderStats.count,
          'Total Revenue': orderStats.revenue,
        };
      });
      filename = `customers-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;
    }

    case 'inventory': {
      const products = await prisma.products.findMany({
        where: {
          tenant_id: tenantId,
          status: 'active',
        },
        select: {
          name: true,
          sku: true,
          stock_quantity: true,
          price: true,
          category_id: true,
        },
      });

      const categoryIds = [
        ...new Set(products.map((p) => p.category_id).filter(Boolean)),
      ] as string[];
      const categories =
        categoryIds.length > 0
          ? await prisma.categories.findMany({
              where: {
                id: { in: categoryIds },
                tenant_id: tenantId,
              },
              select: {
                id: true,
                name: true,
              },
            })
          : [];

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      data = products.map((product) => ({
        Product: product.name,
        SKU: product.sku || '',
        Category: product.category_id
          ? categoryMap.get(product.category_id) || 'Uncategorized'
          : 'Uncategorized',
        'Stock Quantity': product.stock_quantity || 0,
        'Unit Price': Number(product.price),
        'Total Value': (product.stock_quantity || 0) * Number(product.price),
      }));
      filename = `inventory-${new Date().toISOString().split('T')[0]}`;
      break;
    }

    default: {
      const [orders, customers, products] = await Promise.all([
        prisma.orders.count({
          where: {
            tenant_id: tenantId,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.customers.count({
          where: {
            tenant_id: tenantId,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.products.count({
          where: {
            tenant_id: tenantId,
            status: 'active',
          },
        }),
      ]);

      const revenue = await prisma.orders.aggregate({
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          total_amount: true,
        },
      });

      data = {
        Period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        'Total Orders': orders,
        'Total Revenue': Number(revenue._sum.total_amount || 0),
        'New Customers': customers,
        'Active Products': products,
      };
      filename = `overview-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;
    }
  }

  if (format === 'json') {
    return {
      format: 'json',
      filename: `${filename}.json`,
      content: data,
      isCsv: false,
    };
  }

  let csv = '';

  if (Array.isArray(data)) {
    if (data.length > 0) {
      const headers = Object.keys(data[0] as Record<string, unknown>);
      csv += headers.join(',') + '\n';

      data.forEach((row) => {
        const record = row as Record<string, unknown>;
        csv +=
          headers
            .map((header) => {
              const value = record[header];
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',') + '\n';
      });
    }
  } else {
    csv += 'Metric,Value\n';
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
  }

  return {
    format: 'csv',
    filename: `${filename}.csv`,
    content: csv,
    isCsv: true,
  };
}

export const ANALYTICS_HANDLERS: Record<string, AnalyticsHandler> = {
  overview: getAnalyticsOverview,
  revenue: getAnalyticsRevenue,
  sales: getAnalyticsSales,
  customers: getAnalyticsCustomers,
  inventory: getAnalyticsInventory,
  geographic: getAnalyticsGeographic,
  'conversion-funnel': getAnalyticsConversionFunnel,
  'product-performance': getAnalyticsProductPerformance,
  refunds: getAnalyticsRefunds,
  realtime: getAnalyticsRealtime,
  'realtime/poll': getAnalyticsRealtimePoll,
  compare: getAnalyticsCompare,
  'traffic-sources': getAnalyticsTrafficSources,
  export: getAnalyticsExport,
};
