# StoreFlow Dynamic URL Configuration

## Overview

The application is configured to work dynamically with **any domain or subdirectory** based on the `APP_URL` setting in your `.env` file. There are **no hardcoded URLs** - everything uses Laravel's URL helpers that respect `APP_URL`.

## How It Works

The application automatically uses `APP_URL` from your `.env` file for all route generation:

1. **AppServiceProvider** reads `APP_URL` and sets it as the root URL for Laravel
2. **All routes** use Laravel's `url()`, `route()`, and `asset()` helpers
3. **No hardcoding** - works for any domain/subdirectory

## Configuration

### For Local Development (Current Setup)

```env
APP_URL=https://localhost/nazmart
```

**Result:** All routes generate as `https://localhost/nazmart/...`

### For StoreFlow.com Production (Root Domain)

```env
APP_URL=https://storeflow.com
```

**Result:** All routes generate as `https://storeflow.com/...`

### For StoreFlow.com in Subdirectory (if needed)

```env
APP_URL=https://storeflow.com/subfolder
```

**Result:** All routes generate as `https://storeflow.com/subfolder/...`

## Key Files

### 1. AppServiceProvider.php

```70:76:core/app/Providers/AppServiceProvider.php
// Set base path for routes dynamically from APP_URL
// Works for any domain/subdirectory (e.g., localhost/nazmart, storeflow.com, storeflow.com/subfolder)
$appUrl = config('app.url');
if ($appUrl) {
    // Always force root URL to ensure routes include the base path from APP_URL
    URL::forceRootUrl(rtrim($appUrl, '/'));
}
```

This ensures Laravel uses `APP_URL` for all route generation.

### 2. Login Form

The login form uses `url('/admin')` which automatically includes the base path:

```93:93:core/resources/views/landlord/admin/auth/login.blade.php
url: "{{url('/admin')}}",
```

This will generate:
- Local: `https://localhost/nazmart/admin`
- Production: `https://storeflow.com/admin`

## When Deploying to StoreFlow.com

### Step 1: Update .env File

Change `APP_URL` in `core/.env`:

```env
APP_URL=https://storeflow.com
```

**Important:** 
- Use `https://` for production
- No trailing slash
- Include subdirectory if needed (e.g., `https://storeflow.com/subfolder`)

### Step 2: Update CENTRAL_DOMAIN (if using multi-tenancy)

```env
CENTRAL_DOMAIN=storeflow.com
```

### Step 3: Clear All Caches

```bash
cd core
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear
php artisan optimize:clear
```

### Step 4: Verify

After deployment, verify routes are generating correctly:

```bash
cd core
php artisan tinker
```

Then run:
```php
config('app.url')  // Should show: https://storeflow.com
url('/admin')      // Should generate: https://storeflow.com/admin
```

## Benefits

✅ **No hardcoding** - Works with any domain/subdirectory  
✅ **Dynamic** - Automatically uses `APP_URL`  
✅ **Production-ready** - Just update `.env` and deploy  
✅ **Flexible** - Works in root or subdirectory  
✅ **Maintainable** - Single source of truth (`APP_URL`)

## Verification Checklist

Before deploying to StoreFlow.com:

- [ ] `APP_URL` in `.env` is set to `https://storeflow.com`
- [ ] `CENTRAL_DOMAIN` is set to `storeflow.com` (if using multi-tenancy)
- [ ] All caches are cleared
- [ ] Test that routes generate correctly
- [ ] Test login functionality
- [ ] Test asset loading (CSS, JS, images)

## Troubleshooting

### Issue: Routes still showing old URL

**Solution:** Clear all caches:
```bash
php artisan optimize:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Issue: Assets not loading

**Solution:** Check `ASSET_URL` in `.env` (should be empty or match `APP_URL`):
```env
ASSET_URL=
```

### Issue: Login redirects to wrong URL

**Solution:** Verify `APP_URL` is correct and clear caches. The login form uses `url('/admin')` which should automatically use `APP_URL`.

---

**The application is fully configured for dynamic URLs!** Just update `APP_URL` when deploying to StoreFlow.com. 🎉

