/**
 * Theme Branding Upload API Route
 * 
 * POST: Upload logo and/or favicon for theme customization
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;
    const faviconFile = formData.get('favicon') as File | null;
    const type = formData.get('type') as string; // 'logo' or 'favicon'

    const file = type === 'logo' ? logoFile : faviconFile;

    if (!file) {
      return NextResponse.json(
        { error: `No ${type} file provided` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Only images (JPEG, PNG, WebP, SVG, ICO) are allowed for ${type}.` },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for logo, 500KB for favicon)
    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 500 * 1024; // 2MB for logo, 500KB for favicon
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `${type === 'logo' ? 'Logo' : 'Favicon'} size exceeds ${type === 'logo' ? '2MB' : '500KB'} limit` },
        { status: 400 }
      );
    }

    // Create Supabase client with service role for storage operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || (type === 'favicon' ? 'ico' : 'png');
    const fileName = `${tenant.id}/branding/${type}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `themes/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get bucket name from environment variable or use default
    const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'product-images';

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Allow overwriting
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('404')) {
        return NextResponse.json(
          { 
            error: 'Storage bucket not found',
            details: `The bucket "${bucketName}" does not exist in Supabase Storage. Please create it in your Supabase dashboard.`,
            bucketName 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to upload ${type}`, details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({
      message: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`,
      url: urlData.publicUrl,
      path: filePath,
      type,
    });
  } catch (error: any) {
    console.error('Error uploading branding file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

