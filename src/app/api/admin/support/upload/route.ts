/**
 * Landlord Support Ticket Image Upload API Route
 * 
 * Handles POST requests for uploading images to Supabase Storage for landlord support tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireAnyRole } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/support/upload
 * 
 * Upload image for landlord support ticket to Supabase Storage
 * 
 * Accessible to:
 * - Landlord admins (creating/managing tickets)
 * - Tenant admins (creating tickets for the landlord)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    // Allow both landlord and tenant_admin roles
    // Landlord: managing tickets, Tenant admin: creating tickets for landlord
    requireAnyRole(user, ['landlord', 'tenant_admin']); // Use requireAnyRole for API routes

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (images only)
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
    const fileName = `landlord/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `support-tickets/${fileName}`;

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

    return NextResponse.json({
      message: 'Image uploaded successfully',
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    
    // Handle authentication/authorization errors
    if (error.message?.includes('Access denied') || error.message?.includes('Authentication required')) {
      return NextResponse.json(
        { error: error.message || 'Access denied. Required role: landlord or tenant_admin' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

