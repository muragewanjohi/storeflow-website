'use client';

import { useQuery } from '@tanstack/react-query';
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
import type { Tenant } from '@/lib/tenant-context';
import { toast } from 'sonner';

interface ReferralsResponse {
  success: boolean;
  data?: {
    summary: {
      shareSubdomain: string;
      totalReferrals: number;
      pendingReferrals: number;
      qualifiedReferrals: number;
      rewardedReferrals: number;
      rewardedMonths: number;
    };
    items: Array<{
      id: string;
      status: string;
      rewardMonths: number;
      createdAt: string | null;
      qualifiedAt: string | null;
      rewardedAt: string | null;
      referredTenant: {
        id: string;
        name: string;
        subdomain: string;
        status: string;
        createdAt: string | null;
      };
    }>;
  };
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getReferralStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'qualified':
      return 'Qualified';
    case 'rewarded':
      return 'Rewarded';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}

function getReferralStatusVariant(
  status: string,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'rewarded':
      return 'default';
    case 'qualified':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
}

interface ReferralRewardsClientProps {
  tenant: Tenant;
}

export default function ReferralRewardsClient({ tenant }: Readonly<ReferralRewardsClientProps>) {
  const { data: referralsData, isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['dashboard-referrals'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/referrals');
      const payload = (await response.json()) as ReferralsResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error('Failed to load referral summary');
      }
      return payload.data;
    },
  });

  const copyReferralSubdomain = async () => {
    const shareSubdomain = referralsData?.summary.shareSubdomain;
    if (!shareSubdomain) return;
    try {
      await navigator.clipboard.writeText(shareSubdomain);
      toast.success('Referrer subdomain copied');
    } catch {
      toast.error('Failed to copy referrer subdomain');
    }
  };

  const copyReferralLink = async () => {
    const shareSubdomain = referralsData?.summary.shareSubdomain;
    if (!shareSubdomain) return;
    try {
      const url = `${window.location.origin}/register?ref=${encodeURIComponent(shareSubdomain)}`;
      await navigator.clipboard.writeText(url);
      toast.success('Referral link copied');
    } catch {
      toast.error('Failed to copy referral link');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral Rewards</h1>
        <p className="text-muted-foreground mt-1">
          Share your store subdomain with friends and earn free subscription months.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
          <CardDescription>
            Share your store subdomain with friends. You get 1 free month for each friend who
            completes their first paid month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoadingReferrals ? (
            <p className="text-sm text-muted-foreground">Loading referral details...</p>
          ) : (
            <>
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground mb-1">Your referral subdomain</p>
                <p className="font-mono text-sm break-all">
                  {referralsData?.summary.shareSubdomain || tenant.subdomain}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={copyReferralSubdomain}>
                    Copy subdomain
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyReferralLink}>
                    Copy referral link
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total referrals</p>
                  <p className="text-xl font-semibold">
                    {referralsData?.summary.totalReferrals ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-semibold">
                    {referralsData?.summary.pendingReferrals ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Rewarded referrals</p>
                  <p className="text-xl font-semibold">
                    {referralsData?.summary.rewardedReferrals ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Free months earned</p>
                  <p className="text-xl font-semibold">
                    {referralsData?.summary.rewardedMonths ?? 0}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isLoadingReferrals && (
        <Card>
          <CardHeader>
            <CardTitle>Referred friends</CardTitle>
            <CardDescription>
              Stores that signed up using your referral subdomain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(referralsData?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No referrals yet. Share your subdomain or referral link to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Subdomain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead>Rewarded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralsData?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.referredTenant.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.referredTenant.subdomain}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReferralStatusVariant(item.status)}>
                          {getReferralStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{formatDate(item.rewardedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
