# StoreFlow.com Configuration Guide

This document contains specific configuration settings for **StoreFlow.com** setup.

## 🌐 Domain Configuration

### Local Development Settings

Use these settings when developing locally on XAMPP:

```env
APP_NAME="StoreFlow - Multi-Tenancy eCommerce Platform"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost/nazmart
CENTRAL_DOMAIN=localhost
```

### Production Settings (storeflow.com)

When deploying to your live server at `storeflow.com`, use these settings:

```env
APP_NAME="StoreFlow - Multi-Tenancy eCommerce Platform"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://storeflow.com
CENTRAL_DOMAIN=storeflow.com
```

## 📋 Complete .env Configuration

### For Local Development

```env
APP_NAME="StoreFlow - Multi-Tenancy eCommerce Platform"
APP_ENV=local
APP_KEY=base64:FsE9kjNRPZ13Wi4Q+fLxVH0oX/M1jG2kUtXqlbm+tWw=
APP_DEBUG=true
APP_URL=http://localhost/nazmart

LOG_CHANNEL=daily
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=storeflow
DB_USERNAME=root
DB_PASSWORD=

MAIL_MAILER=smtp
MAIL_HOST=YOUR_SMTP_HOST_NAME
MAIL_PORT=587
MAIL_USERNAME=YOUR_SMTP_USERNAME
MAIL_PASSWORD=YOUR_SMTP_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@storeflow.com
MAIL_FROM_NAME="StoreFlow"

BROADCAST_DRIVER=log
CACHE_DRIVER=array
FILESYSTEM_DRIVER=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

CENTRAL_DOMAIN=localhost
TENANT_DATABASE_PREFIX=storeflow_tenant_

APP_TIMEZONE=UTC
```

### For Production (storeflow.com)

```env
APP_NAME="StoreFlow - Multi-Tenancy eCommerce Platform"
APP_ENV=production
APP_KEY=base64:FsE9kjNRPZ13Wi4Q+fLxVH0oX/M1jG2kUtXqlbm+tWw=
APP_DEBUG=false
APP_URL=https://storeflow.com

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=storeflow_prod
DB_USERNAME=your_production_db_user
DB_PASSWORD=your_secure_production_password

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-server.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@storeflow.com
MAIL_FROM_NAME="StoreFlow"

BROADCAST_DRIVER=log
CACHE_DRIVER=redis
FILESYSTEM_DRIVER=local
QUEUE_CONNECTION=database
SESSION_DRIVER=redis
SESSION_LIFETIME=120

CENTRAL_DOMAIN=storeflow.com
TENANT_DATABASE_PREFIX=storeflow_tenant_

APP_TIMEZONE=UTC
```

## 🔑 Key Configuration Points

### 1. APP_NAME
- **Local:** `"StoreFlow - Multi-Tenancy eCommerce Platform"`
- **Production:** `"StoreFlow - Multi-Tenancy eCommerce Platform"`

### 2. CENTRAL_DOMAIN
- **Local:** `localhost` (for local development)
- **Production:** `storeflow.com` (your actual domain)

### 3. APP_URL
- **Local:** `http://localhost/nazmart`
- **Production:** `https://storeflow.com` (use HTTPS in production)

### 4. Database Name
- **Local:** `storeflow` (or any name you prefer)
- **Production:** `storeflow_prod` (or your production database name)

### 5. Tenant Database Prefix
- **Local:** `storeflow_tenant_`
- **Production:** `storeflow_tenant_` (keeps tenant databases organized)

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Update `APP_ENV=production`
- [ ] Set `APP_DEBUG=false`
- [ ] Update `APP_URL=https://storeflow.com`
- [ ] Update `CENTRAL_DOMAIN=storeflow.com`
- [ ] Configure production database credentials
- [ ] Set up SMTP email settings
- [ ] Configure SSL certificate
- [ ] Set up wildcard subdomain DNS (for multi-tenancy)
- [ ] Update file permissions on server
- [ ] Run `php artisan config:cache`
- [ ] Run `php artisan route:cache`
- [ ] Run `php artisan view:cache`

## 🔒 Security Notes

1. **Never commit `.env` file** to version control
2. **Use strong passwords** for production database
3. **Enable HTTPS** in production (SSL certificate required)
4. **Set proper file permissions** (755 for directories, 644 for files)
5. **Keep APP_DEBUG=false** in production
6. **Use secure session drivers** (Redis recommended for production)

## 📧 Email Configuration

For production, configure your SMTP settings:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.storeflow.com
MAIL_PORT=587
MAIL_USERNAME=noreply@storeflow.com
MAIL_PASSWORD=your_smtp_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@storeflow.com
MAIL_FROM_NAME="StoreFlow"
```

## 🌍 Multi-Tenancy Setup

Nazmart uses subdomains for multi-tenancy. For `storeflow.com`:

- **Central Domain:** `storeflow.com` (landlord/admin panel)
- **Tenant Stores:** `tenant1.storeflow.com`, `tenant2.storeflow.com`, etc.

**DNS Configuration Required:**
- Set up wildcard DNS: `*.storeflow.com` → Your server IP
- Configure SSL certificate for wildcard subdomains

## 📝 Notes

- The installation wizard will help you set most of these values
- You can update these settings later in the `.env` file
- Always clear cache after changing `.env` values:
  ```bash
  php artisan config:clear
  php artisan cache:clear
  ```

---

**Your Domain:** storeflow.com  
**Platform:** Nazmart Multi-Tenancy eCommerce Platform

