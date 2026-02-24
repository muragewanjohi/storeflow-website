# Analytics Tracking Setup Guide

## Overview

DukaNest now includes comprehensive analytics tracking for storefronts, including:
- Session tracking
- Page view tracking
- Event tracking (add to cart, checkout start, checkout complete)
- Traffic source tracking (UTM parameters, referrers)
- Real-time analytics
- Scheduled reports

## Database Migration

### Step 1: Run the Migration

The analytics tracking requires new database tables. Run the migration:

```bash
# Using Prisma (recommended)
npx prisma db push

# OR using SQL directly
psql $DATABASE_URL -f supabase/migrations/012_add_storefront_analytics.sql
```

### Step 2: Verify Tables Created

Verify the following tables exist:
- `analytics_sessions`
- `analytics_page_views`
- `analytics_events`

## How It Works

### Automatic Tracking

1. **Page Views**: Automatically tracked when users visit storefront pages
   - Integrated via `AnalyticsProvider` component in storefront layout
   - Tracks product pages, category pages, and all storefront routes

2. **Sessions**: Created automatically on first page load
   - Session ID stored in browser sessionStorage
   - Sessions expire after 30 minutes of inactivity
   - UTM parameters and referrer information captured

3. **Events**: Tracked via API calls
   - `add_to_cart`: Automatically tracked when items are added to cart
   - `checkout_start`: Tracked when user proceeds to payment step
   - `checkout_complete`: Tracked when order is successfully placed

### Manual Event Tracking

You can manually track custom events using the `useAnalytics` hook:

```tsx
import { useAnalytics } from '@/lib/analytics/use-analytics';

function MyComponent() {
  const { track } = useAnalytics();

  const handleCustomAction = async () => {
    await track('custom_event', {
      eventCategory: 'engagement',
      eventLabel: 'Button Clicked',
      metadata: { buttonName: 'Subscribe' },
    });
  };
}
```

## Features

### 1. Conversion Funnel
- Uses actual tracked data from analytics tables
- Falls back to estimates if tables don't exist yet
- Tracks: Visitors → Add to Cart → Checkout → Orders

### 2. Traffic Sources
- Tracks UTM parameters (source, medium, campaign, term, content)
- Categorizes referrers (Direct, Search, Social, Referral)
- Shows revenue by traffic source
- **Social Media Tracking**: Product share buttons automatically add UTM parameters (utm_source=platform, utm_medium=social, utm_campaign=product_share) for accurate social media traffic attribution

### 3. Product Performance
- Uses actual page views from `analytics_page_views` table
- Calculates real conversion rates
- Shows performance trends over time

### 4. Real-Time Analytics
- Live visitor count (active in last 5 minutes)
- Orders in last hour
- Today's revenue and orders
- Recent orders feed
- Auto-refreshes every 30 seconds when Advanced tab is active

### 5. Scheduled Reports
- Create automated email reports (daily, weekly, monthly)
- Supports CSV and PDF formats
- Multiple email recipients
- Automatic delivery via cron job

## Configuration

### Environment Variables

No additional environment variables required. The tracking system uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

### Cron Job Setup

Add to `vercel.json` (already added):

```json
{
  "path": "/api/admin/analytics/send-scheduled-reports",
  "schedule": "0 9 * * *"
}
```

## Usage

### For Storefront Developers

The tracking is automatic. Just ensure `AnalyticsProvider` is included in your storefront layout (already added to `(storefront)/layout.tsx`).

### For Dashboard Developers

Access advanced analytics in the dashboard:
1. Navigate to `/dashboard/analytics`
2. Click on the "Advanced" tab (Pro/Premium plans only)
3. View all advanced metrics

### Creating Scheduled Reports

1. Go to Analytics → Advanced tab
2. Scroll to "Scheduled Reports" section
3. Click "New Report"
4. Configure:
   - Report Type (Overview, Revenue, Sales, Customers, Conversion)
   - Frequency (Daily, Weekly, Monthly)
   - Email Recipients (comma-separated)
   - Format (CSV or PDF)
5. Click "Create Report"

Reports will be automatically sent at the scheduled time.

## Ad Funnel QA Checklist (GA4 + Meta Pixel)

Use this checklist whenever you launch or update paid ad landing pages (for example `/ads/whatsapp`).

### Expected Event Flow

For a successful ad signup journey, you should see this sequence:

1. `page_view` on `/ads/whatsapp`
2. `ad_landing_page_view`
3. `ad_cta_click`
4. `page_view` on `/register?...utm_source=...`
5. `sign_up_started` (after client validation passes)
6. `sign_up_completed` (after registration success)
7. `CompleteRegistration` (Meta Pixel event)

For failed signups, you should see:

- `sign_up_failed` with one of:
  - `client_validation_failed`
  - `server_validation_failed`
  - `registration_failed`
  - `network_or_unexpected_error`

### GA4 Verification Steps

1. Open **GA4 Admin > DebugView**
2. In a fresh browser session, visit `/ads/whatsapp`
3. Click any CTA and continue to `/register`
4. Submit the form
5. Confirm `ad_landing_page_view`, `ad_cta_click`, `sign_up_started`, and either `sign_up_completed` or `sign_up_failed` are visible
6. Confirm event params include:
   - `utm_source`
   - `utm_medium`
   - `utm_campaign`
   - `plan_id`

### GA4 Conversion Setup

Mark this event as a Key Event in GA4:

- `sign_up_completed`

Optional (diagnostic only, not primary conversion):

- `sign_up_started`

### Meta Pixel Verification Steps

1. Open Meta Pixel Helper (browser extension)
2. Visit `/ads/whatsapp`
3. Click CTA to `/register`
4. Confirm Pixel events:
   - `ViewContent` (landing page load)
   - `Lead` (CTA click and/or submit intent)
   - `CompleteRegistration` (successful registration)

### Quick UTM Sanity Check

Ensure all CTA links from the ad landing page pass UTM params to register:

- `utm_source=facebook`
- `utm_medium=paid`
- `utm_campaign=whatsapp_sellers`

If UTM params are missing on `/register`, attribution and campaign reporting will be incomplete.

## Troubleshooting

### No Data Showing

1. **Check Migration**: Ensure migration `012_add_storefront_analytics.sql` has been run
2. **Check Tables**: Verify tables exist in database
3. **Check Tracking**: Visit storefront pages - data should start appearing
4. **Check Console**: Look for any JavaScript errors in browser console

### Events Not Tracking

1. **Check Session**: Ensure session is initialized (should happen automatically)
2. **Check Network**: Verify API calls to `/api/analytics/track/*` are successful
3. **Check Console**: Look for tracking errors in browser console

### Real-Time Not Updating

1. **Check Tab**: Real-time polling only works when Advanced tab is active
2. **Check Network**: Verify `/api/analytics/realtime/poll` endpoint is accessible
3. **Check Console**: Look for polling errors

## Best Practices

1. **Privacy**: Analytics tracking respects user privacy - no PII is stored
2. **Performance**: Tracking is non-blocking and won't slow down the site
3. **Error Handling**: Tracking failures are silent and won't break functionality
4. **Data Retention**: Consider implementing data retention policies for old analytics data

## Next Steps

1. Run the database migration
2. Visit your storefront to generate initial tracking data
3. Check Advanced Analytics tab to see the data
4. Set up scheduled reports if needed

## API Endpoints

### Tracking Endpoints (Internal)
- `POST /api/analytics/track/session` - Initialize/update session
- `POST /api/analytics/track/page-view` - Track page view
- `POST /api/analytics/track/event` - Track custom event

### Analytics Endpoints (Dashboard)
- `GET /api/analytics/conversion-funnel` - Conversion funnel data
- `GET /api/analytics/traffic-sources` - Traffic source breakdown
- `GET /api/analytics/realtime` - Real-time metrics
- `GET /api/analytics/realtime/poll` - Lightweight polling endpoint
- `GET /api/analytics/scheduled-reports` - List scheduled reports
- `POST /api/analytics/scheduled-reports` - Create scheduled report
- `DELETE /api/analytics/scheduled-reports` - Delete scheduled report

### Cron Jobs
- `GET /api/admin/analytics/send-scheduled-reports` - Process and send scheduled reports (runs daily at 9 AM UTC)
