# Day 11 Testing - Quick Start Guide (PowerShell)

**Quick reference for testing domain management on Windows**

---

## 🚀 Quick Setup

### 1. Set Environment Variables

```powershell
# In PowerShell, set environment variables for current session
$env:VERCEL_TOKEN = "your-vercel-token-here"
$env:VERCEL_PROJECT_ID = "your-project-id-here"
```

Or add to `.env.local`:
```env
VERCEL_TOKEN=your-vercel-token-here
VERCEL_PROJECT_ID=your-project-id-here
```

### 2. Start Development Server

```powershell
cd storeflow
npm run dev
```

Server should start on `http://localhost:3000`

---

## 🧪 Quick Tests

### Test 1: Add Domain (PowerShell)

```powershell
# Set variables
$domain = "test.example.com"
$url = "http://localhost:3000/api/admin/domains"

# Create headers
$headers = @{
    "Content-Type" = "application/json"
}

# Create body
$body = @{
    domain = $domain
} | ConvertTo-Json

# Make request
try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    $_.Exception.Response
}
```

### Test 2: Get Domain Info (PowerShell)

```powershell
$domain = "test.example.com"
$url = "http://localhost:3000/api/admin/domains?domain=$domain"

try {
    $response = Invoke-RestMethod -Uri $url -Method GET
    Write-Host "Domain Info:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
```

### Test 3: Remove Domain (PowerShell)

```powershell
$domain = "test.example.com"
$url = "http://localhost:3000/api/admin/domains?domain=$domain"

try {
    $response = Invoke-RestMethod -Uri $url -Method DELETE
    Write-Host "Domain removed!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
```

---

## 🔍 Check Database (Supabase)

### Using Supabase Dashboard:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Table Editor** → `tenants`
4. Check `custom_domain` column

### Using Prisma Studio:
```powershell
npm run db:studio
```
Opens at `http://localhost:5555`

---

## 🌐 Check Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Check if domain appears in list

---

## ✅ Quick Test Checklist

```powershell
# 1. Test Add Domain
Write-Host "`n=== Test 1: Add Domain ===" -ForegroundColor Cyan
# Run Test 1 script above

# 2. Test Get Domain Info
Write-Host "`n=== Test 2: Get Domain Info ===" -ForegroundColor Cyan
# Run Test 2 script above

# 3. Test Remove Domain
Write-Host "`n=== Test 3: Remove Domain ===" -ForegroundColor Cyan
# Run Test 3 script above

# 4. Check Database
Write-Host "`n=== Check Database ===" -ForegroundColor Cyan
Write-Host "Open Prisma Studio: npm run db:studio" -ForegroundColor Yellow

# 5. Check Vercel
Write-Host "`n=== Check Vercel Dashboard ===" -ForegroundColor Cyan
Write-Host "Visit: https://vercel.com/dashboard" -ForegroundColor Yellow
```

---

## 🐛 Common Issues

### Issue: "Cannot connect to server"
**Fix:** Make sure dev server is running (`npm run dev`)

### Issue: "401 Unauthorized"
**Fix:** Check `VERCEL_TOKEN` is set correctly

### Issue: "Domain already exists"
**Fix:** Domain may already be in Vercel. Check dashboard or remove first.

---

## 📝 Test Script Template

Save this as `test-domain.ps1`:

```powershell
# Domain Management Test Script
param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("add", "get", "remove")]
    [string]$Action = "add"
)

$baseUrl = "http://localhost:3000/api/admin/domains"
$headers = @{
    "Content-Type" = "application/json"
}

switch ($Action) {
    "add" {
        Write-Host "Adding domain: $Domain" -ForegroundColor Cyan
        $body = @{ domain = $Domain } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body
        Write-Host "Success!" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
    "get" {
        Write-Host "Getting domain info: $Domain" -ForegroundColor Cyan
        $response = Invoke-RestMethod -Uri "$baseUrl?domain=$Domain" -Method GET
        $response | ConvertTo-Json -Depth 10
    }
    "remove" {
        Write-Host "Removing domain: $Domain" -ForegroundColor Cyan
        $response = Invoke-RestMethod -Uri "$baseUrl?domain=$Domain" -Method DELETE
        Write-Host "Success!" -ForegroundColor Green
        $response | ConvertTo-Json
    }
}
```

**Usage:**
```powershell
# Add domain
.\test-domain.ps1 -Domain "test.example.com" -Action "add"

# Get domain info
.\test-domain.ps1 -Domain "test.example.com" -Action "get"

# Remove domain
.\test-domain.ps1 -Domain "test.example.com" -Action "remove"
```

---

## 🔗 Full Testing Guide

For comprehensive testing instructions, see:
**[DAY_11_MANUAL_TESTING_GUIDE.md](./DAY_11_MANUAL_TESTING_GUIDE.md)**

---

**Happy Testing! 🚀**

