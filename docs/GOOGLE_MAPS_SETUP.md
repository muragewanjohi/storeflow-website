# Google Maps API Setup Guide

This guide will walk you through setting up Google Maps Places API for address autocomplete in the StoreFlow checkout process.

## 📋 Prerequisites

- A Google account (Gmail account works)
- Access to Google Cloud Console
- Your StoreFlow project running locally or deployed

## 🚀 Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top of the page
   - Click "New Project"
   - Enter a project name (e.g., "StoreFlow Maps")
   - Click "Create"
   - Wait for the project to be created (may take a few seconds)

3. **Select Your Project**
   - Make sure your new project is selected in the project dropdown

### Step 2: Enable Required APIs

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services" → "Library"
   - Or visit: https://console.cloud.google.com/apis/library

2. **Enable Maps JavaScript API**
   - Search for "Maps JavaScript API"
   - Click on "Maps JavaScript API"
   - Click the "Enable" button
   - Wait for it to enable (usually instant)

3. **Enable Places API**
   - Go back to the API Library
   - Search for "Places API"
   - Click on "Places API" (make sure it's the one by Google)
   - Click the "Enable" button
   - Wait for it to enable

4. **Verify Enabled APIs**
   - Go to "APIs & Services" → "Enabled APIs"
   - You should see both:
     - ✅ Maps JavaScript API
     - ✅ Places API

### Step 3: Create an API Key

1. **Navigate to Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Or visit: https://console.cloud.google.com/apis/credentials

2. **Create API Key**
   - Click "Create Credentials" → "API Key"
   - A new API key will be created and displayed
   - **Copy this key** - you'll need it in the next step
   - Click "Close" (don't restrict it yet - we'll do that next)

### Step 4: Restrict Your API Key (CRITICAL - DO NOT SKIP)

⚠️ **CRITICAL SECURITY STEP**: This is the **most important step**. Without restrictions, anyone can use your API key and you'll be billed for their usage. **Never skip this step!**

1. **Edit API Key Restrictions**
   - In the Credentials page, find your newly created API key
   - Click on the API key name to edit it

2. **Set Application Restrictions** (This is what protects your key!)
   - Under "Application restrictions", select "HTTP referrers (web sites)"
   - Click "Add an item"
   - Add your domains (replace with your actual domain):
     ```
     http://localhost:3000/*
     https://localhost:3000/*
     https://yourdomain.com/*
     https://*.yourdomain.com/*
     ```
   - For production, add your actual Vercel domain:
     ```
     https://your-app.vercel.app/*
     https://*.vercel.app/*
     https://yourstore.com/*
     https://*.yourstore.com/*
     ```
   - **Important**: Include both `http://` and `https://` for localhost
   - **Important**: Include your Vercel preview URLs if you use preview deployments

3. **Set API Restrictions**
   - Under "API restrictions", select "Restrict key"
   - Check only these APIs:
     - ✅ Maps JavaScript API
     - ✅ Places API
   - Click "Save"

4. **Wait for Restrictions to Apply**
   - Restrictions may take a few minutes to propagate

### Step 5: Set Up Billing (Required)

⚠️ **Important**: Google Maps APIs require a billing account, but they offer a **$200 free credit per month**.

1. **Navigate to Billing**
   - Go to "Billing" in the left sidebar
   - Or visit: https://console.cloud.google.com/billing

2. **Create Billing Account**
   - Click "Link a billing account" or "Create billing account"
   - Fill in your billing information
   - Add a payment method (credit card)
   - **Note**: You won't be charged unless you exceed the free tier

3. **Link Billing to Project**
   - Make sure your project is linked to the billing account
   - Go to "APIs & Services" → "Enabled APIs"
   - If you see a billing warning, click it and link your billing account

### Step 6: Add API Key to Your Project

1. **Local Development (.env.local)**

   Open or create `.env.local` in your project root:

   ```bash
   # Google Maps API Configuration
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

   Replace `your_api_key_here` with the API key you copied in Step 3.

2. **Production (Vercel)**

   If deploying to Vercel:

   - Go to your Vercel project dashboard
   - Navigate to "Settings" → "Environment Variables"
   - Add a new variable:
     - **Name**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
     - **Value**: Your API key
     - **Environment**: Production, Preview, Development (select all)
   - Click "Save"
   
   ⚠️ **Vercel Warning**: You may see a warning that says:
   > "This key, which is prefixed with `NEXT_PUBLIC_` and includes the term `KEY`, might expose sensitive information to the browser."
   
   **✅ This is safe to proceed - click "Save"!** 
   
   **Why it's safe:**
   - Google Maps API keys are **designed to be public** (unlike secret keys like database passwords)
   - Security comes from **restrictions**, not secrecy
   - The key will only work on domains you've whitelisted in Google Cloud Console
   - The key is restricted to specific APIs only (Maps JavaScript API and Places API)
   - Even if someone copies your key, they can't use it without your whitelisted domains
   
   **⚠️ CRITICAL**: Make sure you've completed **Step 4** (API key restrictions) before proceeding!
   
   For more details, see **[GOOGLE_MAPS_VERCEL_WARNING.md](./GOOGLE_MAPS_VERCEL_WARNING.md)**

3. **Restart Your Development Server**

   After adding the environment variable:

   ```bash
   # Stop your dev server (Ctrl+C)
   # Then restart it
   npm run dev
   ```

### Step 7: Test the Integration

1. **Start Your Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to Checkout**
   - Go to your storefront
   - Add items to cart
   - Proceed to checkout

3. **Test Address Autocomplete**
   - In the address field, start typing an address
   - You should see Google Places suggestions appear
   - Select an address
   - Verify that city, state, postal code, and country auto-fill

## 💰 Pricing & Free Tier

### Free Tier (Monthly Credits)
- **$200 free credit per month**
- This covers:
  - Maps JavaScript API: $7 per 1,000 loads
  - Places API (Autocomplete): $2.83 per 1,000 sessions
  - Places API (Details): $17 per 1,000 requests

### Typical Usage Estimates
- **Small store** (< 1,000 orders/month): Well within free tier
- **Medium store** (1,000-10,000 orders/month): Likely within free tier
- **Large store** (> 10,000 orders/month): May incur small charges

### Monitor Usage
- Go to "APIs & Services" → "Dashboard"
- Check your API usage and costs
- Set up billing alerts if needed

## 🔒 Security Best Practices

### Understanding the "Public" API Key

⚠️ **Important**: Google Maps API keys are **intentionally public** and will be exposed in your browser's JavaScript. This is by design and is safe when properly configured.

**Why it's safe:**
- Google Maps API keys are meant for client-side use (unlike secret keys)
- Security comes from **restrictions**, not secrecy
- Even if someone copies your key, they can't use it without:
  - Access to your whitelisted domains
  - The specific APIs you've enabled

### Security Measures (CRITICAL)

1. **Always Restrict API Keys** ⚠️ **MANDATORY**
   - **HTTP Referrer Restrictions**: Limit to your specific domains
     ```
     localhost:3000/*
     yourdomain.com/*
     *.yourdomain.com/*
     ```
   - **API Restrictions**: Only enable Maps JavaScript API and Places API
   - **Without restrictions, anyone can use your key and bill you!**

2. **Use Different Keys for Different Environments**
   - **Development key**: Restricted to `localhost:3000/*`
   - **Production key**: Restricted to your production domain only
   - This prevents development keys from being used in production

3. **Monitor API Usage**
   - Set up billing alerts in Google Cloud Console
   - Review usage regularly for unexpected spikes
   - Set daily/monthly budget limits

4. **Never Commit API Keys**
   - Keep API keys in `.env.local` (already in `.gitignore`)
   - Never commit keys to version control
   - Use environment variables in Vercel

5. **Rotate Keys Periodically**
   - Create new keys and update your environment variables
   - Delete old keys after confirming new ones work
   - Rotate if you suspect a key has been compromised

### Alternative: Server-Side Proxy (Advanced)

If you want extra security, you can proxy Google Maps requests through your server:

**Pros:**
- API key never exposed to browser
- More control over usage
- Can implement rate limiting

**Cons:**
- More complex setup
- Additional server load
- Slightly slower (extra hop)

**When to use:**
- High-security requirements
- Need to hide usage patterns
- Want server-side rate limiting

For most use cases, the standard client-side approach with proper restrictions is sufficient and recommended by Google.

## 🐛 Troubleshooting

### Issue: "This API key is not authorized"
**Solution**: 
- Make sure both Maps JavaScript API and Places API are enabled
- Check that your API key restrictions allow your domain
- Wait a few minutes for restrictions to propagate

### Issue: "Google Maps script failed to load"
**Solution**:
- Verify your API key is correct in `.env.local`
- Check browser console for specific error messages
- Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly
- Restart your development server after adding the key

### Issue: "Billing account required"
**Solution**:
- Link a billing account to your project
- Even with free tier, a billing account is required
- You won't be charged unless you exceed free credits

### Issue: Autocomplete not showing suggestions
**Solution**:
- Check browser console for errors
- Verify API key is correctly set
- Ensure Places API is enabled
- Check that your domain is in the API key restrictions

### Issue: "Quota exceeded"
**Solution**:
- Check your API usage in Google Cloud Console
- You may have exceeded the free tier
- Consider implementing request caching
- Review your implementation for unnecessary API calls

## 📚 Additional Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Pricing Information](https://developers.google.com/maps/billing-and-pricing/pricing)

## ✅ Checklist

Before going to production, ensure:

- [ ] Google Cloud project created
- [ ] Maps JavaScript API enabled
- [ ] Places API enabled
- [ ] API key created
- [ ] API key restricted to your domains
- [ ] API key restricted to specific APIs only
- [ ] Billing account linked
- [ ] API key added to `.env.local` (development)
- [ ] API key added to Vercel environment variables (production)
- [ ] Address autocomplete tested in checkout
- [ ] Delivery zone detection tested

## 🎉 You're All Set!

Once you've completed these steps, your StoreFlow checkout will have Google Maps Places Autocomplete enabled. Users can now simply type their address and select from Google's suggestions, making checkout faster and more accurate.

---

**Need Help?** If you encounter any issues, check the troubleshooting section above or refer to the Google Maps Platform documentation.
