import { Suspense } from 'react';
import CampaignDetailClient from './campaign-detail-client';

export const dynamic = 'force-dynamic';

export default function VendorCampaignDetailPage() {
  return (
    <Suspense>
      <CampaignDetailClient />
    </Suspense>
  );
}
