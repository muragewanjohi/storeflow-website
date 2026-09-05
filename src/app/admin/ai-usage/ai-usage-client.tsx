'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CpuChipIcon,
  CurrencyDollarIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { aiFeatureLabel as featureLabel } from '@/lib/ai/feature-labels';

export interface AiUsageFeatureRow {
  feature: string;
  bucket: string;
  provider: 'claude' | 'gemini';
  requests: number;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export interface AiUsageTenantRow {
  /** Null for anonymous/pre-registration Gemini usage — see the starter-pack route's docblock. */
  tenantId: string | null;
  name: string;
  subdomain: string | null;
  requests: number;
  cost: number;
}

export interface AiUsageDayRow {
  date: string;
  cost: number;
  requests: number;
}

interface AiUsageClientProps {
  allTimeCost: number;
  allTimeRequests: number;
  monthCost: number;
  monthRequests: number;
  providerTotals: {
    claude: { cost: number; requests: number };
    gemini: { cost: number; requests: number };
  };
  featureRows: AiUsageFeatureRow[];
  tenantRows: AiUsageTenantRow[];
  trend: AiUsageDayRow[];
}


function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: 4 })}`;
}

export default function AiUsageClient({
  allTimeCost,
  allTimeRequests,
  monthCost,
  monthRequests,
  providerTotals,
  featureRows,
  tenantRows,
  trend,
}: Readonly<AiUsageClientProps>) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month — Cost</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUsd(monthCost)}</div>
            <p className="text-xs text-muted-foreground">Claude + Gemini, list pricing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month — Requests</CardTitle>
            <CpuChipIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across every AI feature and tenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All-Time — Cost</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUsd(allTimeCost)}</div>
            <p className="text-xs text-muted-foreground">Since AI usage logging began</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All-Time — Requests</CardTitle>
            <CpuChipIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allTimeRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cumulative, every feature</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider split */}
      <Card>
        <CardHeader>
          <CardTitle>This Month — By Provider</CardTitle>
          <CardDescription>Claude powers the assistant, descriptions, and every other dashboard AI feature; Gemini powers the onboarding Store Starter Pack (content + image generation).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Claude (Anthropic)</p>
              <p className="text-2xl font-bold mt-1">{formatUsd(providerTotals.claude.cost)}</p>
              <p className="text-xs text-muted-foreground">{providerTotals.claude.requests.toLocaleString()} requests this month</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Gemini (Google)</p>
              <p className="text-2xl font-bold mt-1">{formatUsd(providerTotals.gemini.cost)}</p>
              <p className="text-xs text-muted-foreground">{providerTotals.gemini.requests.toLocaleString()} requests this month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-muted-foreground" />
            AI Provider Billing
          </CardTitle>
          <CardDescription>
            Gemini costs shown above are estimated from real token/image counts at published list pricing (not billed amounts) — Google AI Studio is still the source of truth for actual invoiced spend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Anthropic Console</p>
                <p className="text-xs text-muted-foreground">Claude billing, usage, and API keys.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer">
                  Open
                  <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Google AI Studio (Gemini)</p>
                <p className="text-xs text-muted-foreground">Gemini API keys and billing, via Google Cloud — powers the onboarding Store Starter Pack.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
                  Open
                  <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 30-day trend */}
      <Card>
        <CardHeader>
          <CardTitle>Last 30 Days</CardTitle>
          <CardDescription>Daily AI spend across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.some((d) => d.requests > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorAiCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(value) => formatUsd(value)}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  width={70}
                />
                <Tooltip
                  formatter={(value: number, name) => [name === 'cost' ? formatUsd(value) : value, name === 'cost' ? 'Cost' : 'Requests']}
                  labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} fill="url(#colorAiCost)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground">
              <CpuChipIcon className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No AI usage in the last 30 days</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By feature */}
        <Card>
          <CardHeader>
            <CardTitle>This Month — By Feature</CardTitle>
            <CardDescription>Where AI cost is actually going</CardDescription>
          </CardHeader>
          <CardContent>
            {featureRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI usage logged this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>
                      <span className="sr-only">Provider / bucket</span>
                    </TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureRows.map((row) => (
                    <TableRow key={`${row.feature}-${row.bucket}-${row.provider}`}>
                      <TableCell className="font-medium">{featureLabel(row.feature)}</TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant={row.provider === 'gemini' ? 'secondary' : 'outline'} className="text-xs">
                          {row.provider}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {row.bucket}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatUsd(row.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* By tenant */}
        <Card>
          <CardHeader>
            <CardTitle>This Month — Top Tenants</CardTitle>
            <CardDescription>Highest AI spend, up to 10</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI usage logged this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantRows.map((row) => (
                    <TableRow key={row.tenantId ?? 'anonymous'}>
                      <TableCell className="font-medium">
                        {row.tenantId && row.subdomain ? (
                          <Link href={`/admin/tenants/${row.tenantId}`} className="hover:underline">
                            {row.name}
                          </Link>
                        ) : (
                          <span className={row.tenantId ? undefined : 'text-muted-foreground italic'}>{row.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{row.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatUsd(row.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
