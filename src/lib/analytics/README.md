# Google Analytics Setup Guide

## Quick Setup

1. **Get your Google Analytics Measurement ID:**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a property or use an existing one
   - Navigate to: Admin → Data Streams → Web Stream
   - Copy your Measurement ID (format: `G-XXXXXXXXXX`)

2. **Add to environment variables:**
   - Add to `.env.local`: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
   - For production, add in Vercel Dashboard → Settings → Environment Variables

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## Verifying Tracking is Working

### In Development Mode

1. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Look for messages like:
     - `[Google Analytics] Script loaded successfully`
     - `[Google Analytics] Page view tracked: /admin/dashboard`
     - `[Admin Dashboard] Google Analytics is available and tracking is active`

2. **Check Network Tab:**
   - Look for requests to `www.googletagmanager.com/gtag/js?id=G-...`
   - Look for requests to `www.google-analytics.com/g/collect`

3. **Check Google Analytics Real-Time:**
   - Go to Google Analytics Dashboard
   - Navigate to: Reports → Real-time
   - Visit your admin dashboard
   - You should see your visit appear in real-time

### Common Issues

**Issue: No tracking messages in console**
- **Solution:** Make sure `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set in `.env.local`
- **Solution:** Restart your dev server after adding the environment variable

**Issue: "gtag is not available" warning**
- **Solution:** The script might still be loading. Wait a few seconds and refresh
- **Solution:** Check browser console for script loading errors

**Issue: Tracking works in dev but not production**
- **Solution:** Make sure `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set in Vercel environment variables
- **Solution:** Redeploy after adding the environment variable

## What Gets Tracked

### Landing Page
- Custom event: `landing_page_view` when users visit the marketing landing page

### Admin Dashboard
- Page views: `admin_page_view` event with page path and user ID
- Dashboard insights: `admin_insight` event with tenant statistics
- User actions: `admin_action` event when clicking quick actions

### All Pages
- Automatic page view tracking on route changes

## Testing Tracking

You can test tracking by:

1. Opening browser console
2. Visiting the admin dashboard
3. Looking for console messages confirming tracking
4. Checking Google Analytics Real-Time reports

## Debug Mode

In development mode, all tracking calls are logged to the console. In production, these logs are disabled for performance.

