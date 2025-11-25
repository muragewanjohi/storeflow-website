/**
 * Media Upload API Route
 * 
 * Handles POST requests for uploading media files (images) to Supabase Storage
 * Used for pages, blogs, and general media library
 * 
 * Day 27: Content Management - Media Library
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';

/**
 * POST /api/media/upload
 * 
 * Upload media file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPEG, PNG, WebP, GIF) are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role for storage operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenant.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `media/${fileName}`;

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
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      
      // Provide helpful error message if bucket doesn't exist
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
        { error: 'Failed to upload image', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // Create media_uploads record
    const mediaRecord = await prisma.media_uploads.create({
      data: {
        tenant_id: tenant.id,
        title: null, // User can set title later
        path: filePath,
        alt_text: null, // User can set alt text later
        file_type: file.type,
        file_size: file.size,
        is_synced: true,
      },
    });

    return NextResponse.json({
      message: 'Image uploaded successfully',
      id: mediaRecord.id,
      url: urlData.publicUrl,
      path: filePath,
      filename: file.name,
      size: file.size,
      type: file.type,
      title: mediaRecord.title,
      alt_text: mediaRecord.alt_text,
    });
  } catch (error) {
    console.error('Error uploading media:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to upload media'
      },
      { status: 500 }
    );
  }
}

