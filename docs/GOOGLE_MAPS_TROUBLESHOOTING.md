# Google Maps Places Autocomplete - Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Cannot read properties of undefined (reading 'Autocomplete')"

**Error Message:**
```
TypeError: Cannot read properties of undefined (reading 'Autocomplete')
```

**Cause:**
- The Google Maps Places library hasn't fully loaded when the code tries to use it
- The script is loading asynchronously but the component initializes before it's ready

**Solution:**
The component has been updated to:
1. Use a callback-based script loading approach
2. Wait for the Places library to be fully initialized before using it
3. Add a small delay to ensure the library is ready

**If the error persists:**
1. Check that your API key is set: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Verify both **Maps JavaScript API** and **Places API** are enabled in Google Cloud Console
3. Check browser console for API key errors
4. Ensure your API key restrictions allow your domain

### Issue 2: Deprecation Warning

**Warning Message:**
```
As of March 1st, 2025, google.maps.places.Autocomplete is not available to new customers. 
Please use google.maps.places.PlaceAutocompleteElement instead.
```

**What This Means:**
- **Existing customers** (API keys created before March 1, 2025): Can continue using `Autocomplete` - it will still work
- **New customers** (API keys created after March 1, 2025): Must use `PlaceAutocompleteElement`

**Current Status:**
- The component currently uses the legacy `Autocomplete` API
- This works fine for existing customers
- The deprecation warning is informational - the API still works

**Future Migration:**
If you're a new customer or want to future-proof:
- The new `PlaceAutocompleteElement` is a web component
- It requires a different implementation approach
- Migration guide: https://developers.google.com/maps/documentation/javascript/places-migration-overview

**For Now:**
- If you're an existing customer: The current implementation works fine
- The warning is just informational
- Google promises 12 months notice before full deprecation

### Issue 3: Autocomplete Not Showing Suggestions

**Possible Causes:**
1. **API Key Not Set**
   - Check `.env.local` has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - Restart dev server after adding the key

2. **Places API Not Enabled**
   - Go to Google Cloud Console → APIs & Services → Enabled APIs
   - Ensure "Places API" is enabled

3. **API Key Restrictions Too Strict**
   - Check HTTP referrer restrictions in Google Cloud Console
   - Ensure your domain is whitelisted (including `localhost:3000` for dev)

4. **Billing Not Set Up**
   - Google Maps APIs require a billing account
   - Even with free tier, billing must be linked

### Issue 4: Script Loading Errors

**Symptoms:**
- Console shows script loading errors
- Autocomplete never initializes

**Solutions:**
1. Check network tab for failed script requests
2. Verify API key is correct
3. Check CORS/domain restrictions
4. Try hard refresh (Ctrl+Shift+R)

## Debugging Steps

### Step 1: Verify API Key
```bash
# Check .env.local
cat .env.local | grep GOOGLE_MAPS
```

### Step 2: Check Browser Console
Open browser DevTools → Console and look for:
- API key errors
- Script loading errors
- Places library initialization errors

### Step 3: Verify Google Cloud Console Settings
1. Go to: https://console.cloud.google.com/apis/credentials
2. Check your API key:
   - ✅ HTTP referrer restrictions include your domain
   - ✅ API restrictions include "Maps JavaScript API" and "Places API"
   - ✅ Billing is linked

### Step 4: Test API Key Directly
Open browser console and run:
```javascript
// Check if Google Maps is loaded
console.log('Google loaded:', !!window.google);
console.log('Maps loaded:', !!window.google?.maps);
console.log('Places loaded:', !!window.google?.maps?.places);
console.log('Autocomplete available:', !!window.google?.maps?.places?.Autocomplete);
```

## Component Location

The Google Places autocomplete is located in:
- **Component**: `src/components/address/address-autocomplete.tsx`
- **Used in**: `src/app/checkout/checkout-client.tsx` (line ~1150)
- **Field**: "Address *" input field in checkout form

## Quick Fixes

### If Autocomplete Doesn't Appear:
1. ✅ Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
2. ✅ Restart dev server: `npm run dev`
3. ✅ Check browser console for errors
4. ✅ Verify Places API is enabled in Google Cloud Console

### If You See the Deprecation Warning:
- ✅ **For existing customers**: This is just a warning, everything still works
- ✅ **For new customers**: You may need to use the new API (contact support if needed)

### If Script Fails to Load:
1. Check API key is correct
2. Verify domain restrictions allow your site
3. Check network tab for 403/401 errors
4. Ensure billing is set up

## Still Having Issues?

1. Check the main setup guide: `docs/GOOGLE_MAPS_SETUP.md`
2. Review Google's official docs: https://developers.google.com/maps/documentation/places/web-service
3. Check browser console for specific error messages
4. Verify all prerequisites from the setup guide are completed

---

**Last Updated**: Based on Google Maps API changes as of March 2025
