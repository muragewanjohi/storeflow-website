# Supabase Storage Bucket Setup Guide

This guide explains how to set up the Supabase Storage bucket for product image uploads.

## Problem

If you see the error:
```
Supabase upload error: [Error [StorageApiError]: Bucket not found]
```

This means the storage bucket doesn't exist in your Supabase project.

## Solution: Create the Storage Bucket

### Step 1: Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project

### Step 2: Navigate to Storage

1. Click on **"Storage"** in the left sidebar
2. You'll see a list of buckets (if any exist)

### Step 3: Create New Bucket

1. Click the **"New bucket"** button
2. Fill in the bucket details:
   - **Name**: `product-images` (or match your `NEXT_PUBLIC_STORAGE_BUCKET` env variable)
   - **Public bucket**: ✅ **Enable this** (so images can be accessed via public URLs)
   - **File size limit**: `5242880` (5MB in bytes) or leave empty for no limit
   - **Allowed MIME types**: Leave empty to allow all image types, or specify:
     - `image/jpeg,image/jpg,image/png,image/webp,image/gif`

3. Click **"Create bucket"**

### Step 4: Configure Bucket Policies (Optional but Recommended)

For security, you can set up Row Level Security (RLS) policies:

1. Click on your bucket name
2. Go to **"Policies"** tab
3. Create policies as needed:

**Policy 1: Allow authenticated users to upload**
- Policy name: `Allow authenticated uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition:
  ```sql
  (bucket_id = 'product-images'::text) AND (auth.role() = 'authenticated'::text)
  ```

**Policy 2: Allow public read access**
- Policy name: `Allow public reads`
- Allowed operation: `SELECT`
- Target roles: `public`
- Policy definition:
  ```sql
  bucket_id = 'product-images'::text
  ```

**Policy 3: Allow authenticated users to update/delete their own files**
- Policy name: `Allow authenticated updates`
- Allowed operation: `UPDATE, DELETE`
- Target roles: `authenticated`
- Policy definition:
  ```sql
  (bucket_id = 'product-images'::text) AND (auth.role() = 'authenticated'::text)
  ```

### Step 5: Verify Environment Variable

Make sure your `.env.local` file has the correct bucket name:

```env
NEXT_PUBLIC_STORAGE_BUCKET=product-images
```

If you used a different bucket name, update this variable to match.

### Step 6: Test the Upload

1. Restart your Next.js dev server
2. Try uploading a product image again
3. The upload should now work!

## Troubleshooting

### Error: "Bucket not found"
- **Solution**: Make sure the bucket name in Supabase matches your `NEXT_PUBLIC_STORAGE_BUCKET` environment variable
- **Check**: Go to Supabase Dashboard → Storage and verify the bucket exists

### Error: "new row violates row-level security policy"
- **Solution**: The bucket has RLS enabled but no policies. Either:
  1. Disable RLS on the bucket (Settings → Disable RLS), OR
  2. Add the policies mentioned in Step 4 above

### Error: "File size exceeds limit"
- **Solution**: Increase the file size limit in the bucket settings, or reduce the file size in the upload route code

### Images not showing publicly
- **Solution**: Make sure the bucket is set to **"Public bucket"** in the bucket settings

## Default Bucket Name

If `NEXT_PUBLIC_STORAGE_BUCKET` is not set, the code defaults to `product-images`.

## Folder Structure

Images are stored in the following structure:
```
product-images/
  └── {tenant-id}/
      └── {timestamp}-{random}.{ext}
```

Example:
```
product-images/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── 1704067200000-abc123.jpg
```

This ensures each tenant's images are organized in their own folder.

