# Analytics Dashboard Setup

## Database Setup

1. **Run the database migration:**
   ```bash
   # Option 1: Using Prisma (recommended)
   npx prisma db push
   
   # Option 2: Run SQL directly
   psql $DATABASE_URL -f prisma/migrations/add_analytics_tracking.sql
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

## How It Works

1. **Automatic Tracking:**
   - Page views are automatically tracked when users visit admin pages
   - Events are tracked when users interact with the dashboard
   - All data is stored in the `analytics_tracking` table

2. **Visual Dashboard:**
   - Access the analytics dashboard from the Admin Dashboard
   - Click on the "Analytics" tab to see visual charts and statistics
   - View data by Day, Month, or Year

3. **What Gets Tracked:**
   - Page views (admin_page_view events)
   - User actions (admin_action events)
   - Dashboard insights (admin_insight events)
   - All tracking includes user ID, page path, timestamps, and metadata

## Features

- **Page Views Chart:** Line chart showing page views over time
- **Events Chart:** Line chart showing user interactions over time
- **Combined View:** See both metrics together
- **Top Pages:** Bar chart of most visited pages
- **Event Types:** Pie chart showing distribution of event types
- **Summary Stats:** Total views, events, and unique users

## Troubleshooting

**No data showing:**
- Make sure you've visited some admin pages after setting up the database
- Check that the migration ran successfully
- Verify the `analytics_tracking` table exists in your database

**Charts not loading:**
- Check browser console for errors
- Ensure Recharts is installed: `npm install recharts`
- Try refreshing the page

