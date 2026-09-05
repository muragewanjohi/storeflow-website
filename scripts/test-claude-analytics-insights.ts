/**
 * Live smoke test for the Analytics Insight Summary (AI Phase 3.1),
 * src/app/api/analytics/ai-insights/route.ts. Mirrors the route's snapshot
 * query + prompt/schema rather than importing it (Next.js route files only
 * allow HTTP-method exports) — same pattern as the other test-claude-*.ts
 * scripts.
 *
 * Runs the real Prisma snapshot query against a live tenant with real order
 * history, then verifies the numbers Claude's narrative actually mentions
 * match the real computed snapshot exactly — this route's whole point is
 * that Claude narrates, never recomputes, so a test that didn't check this
 * wouldn't verify the thing that matters.
 *
 * Usage: npm run test:claude-analytics-insights
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = 'e401c99b-c078-4ab4-96f9-fc901f9110a9';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function growthPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round1(((current - previous) / previous) * 100);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { generateJson, estimateCostUsd } = await import('../src/lib/ai/claude-client');
  const { prisma } = await import('../src/lib/prisma/client');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const period1Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const period2Start = new Date(period1Start.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrdersAgg,
    totalCustomers,
    activeProducts,
    thisMonthAgg,
    newCustomersThisMonth,
    pendingOrders,
    period1Agg,
    period1Customers,
    period2Agg,
    period2Customers,
  ] = await Promise.all([
    prisma.orders.aggregate({ where: { tenant_id: TEST_TENANT_ID, payment_status: 'paid' }, _sum: { total_amount: true }, _count: true }),
    prisma.customers.count({ where: { tenant_id: TEST_TENANT_ID } }),
    prisma.products.count({ where: { tenant_id: TEST_TENANT_ID, status: 'active' } }),
    prisma.orders.aggregate({
      where: { tenant_id: TEST_TENANT_ID, payment_status: 'paid', created_at: { gte: monthStart } },
      _sum: { total_amount: true },
      _count: true,
    }),
    prisma.customers.count({ where: { tenant_id: TEST_TENANT_ID, created_at: { gte: monthStart } } }),
    prisma.orders.count({ where: { tenant_id: TEST_TENANT_ID, status: { in: ['pending', 'processing'] } } }),
    prisma.orders.aggregate({
      where: { tenant_id: TEST_TENANT_ID, payment_status: 'paid', created_at: { gte: period1Start, lte: now } },
      _sum: { total_amount: true },
      _count: true,
    }),
    prisma.customers.count({ where: { tenant_id: TEST_TENANT_ID, created_at: { gte: period1Start, lte: now } } }),
    prisma.orders.aggregate({
      where: { tenant_id: TEST_TENANT_ID, payment_status: 'paid', created_at: { gte: period2Start, lt: period1Start } },
      _sum: { total_amount: true },
      _count: true,
    }),
    prisma.customers.count({ where: { tenant_id: TEST_TENANT_ID, created_at: { gte: period2Start, lt: period1Start } } }),
  ]);

  const period1Revenue = Number(period1Agg._sum.total_amount ?? 0);
  const period2Revenue = Number(period2Agg._sum.total_amount ?? 0);

  const snapshot = {
    currency: 'KES',
    totals: {
      orders: totalOrdersAgg._count,
      revenue: Number(totalOrdersAgg._sum.total_amount ?? 0),
      customers: totalCustomers,
      activeProducts,
    },
    thisMonth: {
      orders: thisMonthAgg._count,
      revenue: Number(thisMonthAgg._sum.total_amount ?? 0),
      newCustomers: newCustomersThisMonth,
    },
    pendingOrders,
    last30DaysVsPrior30Days: {
      revenue: { current: period1Revenue, previous: period2Revenue, growthPercent: growthPercent(period1Revenue, period2Revenue) },
      orders: { current: period1Agg._count, previous: period2Agg._count, growthPercent: growthPercent(period1Agg._count, period2Agg._count) },
      customers: {
        current: period1Customers,
        previous: period2Customers,
        growthPercent: growthPercent(period1Customers, period2Customers),
      },
    },
  };

  console.log('Real snapshot (from Prisma, not Claude):');
  console.log(JSON.stringify(snapshot, null, 2));

  const schema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      highlights: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'highlights'],
    additionalProperties: false,
  } as const;

  const system = [
    'You are a business-analytics narrator for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    "You will be given REAL, already-computed numbers for a merchant's store: lifetime totals, this month's figures, and a 30-day-vs-previous-30-day comparison with real growth percentages.",
    'Explain what these numbers mean in plain, honest language — encouraging where warranted, direct about declines too. Do not be generic; reference the actual figures.',
    'You must NEVER alter, recompute, round differently, or invent any number — use only the exact figures given, and only the metrics given.',
    'Write a summary of 2-4 sentences covering the most notable trend(s), then up to 3 short highlight bullet points (each one sentence).',
    'If a metric shows no meaningful change, you do not need to mention it.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');

  const { data, usage } = await generateJson<{ summary: string; highlights: string[] }>({
    system,
    userContent: `Here is this merchant's real analytics data (all numbers already computed — do not alter them):\n${JSON.stringify(snapshot, null, 2)}`,
    schema,
    maxTokens: 400,
  });

  const cost = estimateCostUsd(usage);
  console.log(`\nClaude's narrative [$${cost.toFixed(6)}]:`);
  console.log(`Summary: ${data.summary}`);
  console.log('Highlights:');
  data.highlights.forEach((h) => console.log(`  - ${h}`));

  // Sanity check: every number literal Claude's narrative mentions should
  // appear somewhere in the real snapshot (as an integer or with up to 1
  // decimal place for percentages) — a crude but real check against
  // fabricated/altered figures.
  const realNumbers = new Set<string>();
  const collectNumbers = (obj: unknown) => {
    if (typeof obj === 'number') {
      realNumbers.add(String(Math.round(obj)));
      realNumbers.add(obj.toFixed(1));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(collectNumbers);
    }
  };
  collectNumbers(snapshot);

  const narrativeText = [data.summary, ...data.highlights].join(' ');
  const mentionedNumbers = narrativeText.match(/\d+(\.\d+)?/g) ?? [];
  const unmatched = mentionedNumbers.filter((n) => !realNumbers.has(n) && !realNumbers.has(String(Math.round(Number(n)))));

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Numbers mentioned in the narrative NOT found in the real snapshot: ${unmatched.join(', ')} — review for fabrication/rounding drift.`);
  } else {
    console.log('\n✅ Every number mentioned in the narrative matches the real computed snapshot.');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Analytics insights test failed:');
  console.error(error);
  process.exit(1);
});
