import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can upload media via mobile API'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'No file provided', [
          { field: 'file', message: 'A file is required' },
        ]),
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'Invalid file type', [
          { field: 'file', message: 'Only JPEG, PNG, WebP and GIF images are allowed' },
        ]),
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'File exceeds maximum size', [
          { field: 'file', message: 'Maximum file size is 5MB' },
        ]),
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        mobileError('INTERNAL_ERROR', 'Storage service is not configured'),
        { status: 500 },
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'product-images';
    const fileExt = file.name.split('.').pop() || 'bin';
    const filePath = `media/${user.tenant_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Mobile Media Upload] Storage error:', uploadError);
      return NextResponse.json(
        mobileError('INTERNAL_ERROR', 'Failed to upload media'),
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    const mediaRecord = await prisma.media_uploads.create({
      data: {
        tenant_id: user.tenant_id,
        path: filePath,
        file_type: file.type,
        file_size: file.size,
        is_synced: true,
      },
      select: {
        id: true,
        created_at: true,
      },
    });

    return NextResponse.json(
      mobileSuccess({
        id: mediaRecord.id,
        url: urlData.publicUrl,
        path: filePath,
        filename: file.name,
        size: file.size,
        type: file.type,
        createdAt: mediaRecord.created_at?.toISOString() ?? null,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Media Upload] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to upload media'),
      { status: 500 },
    );
  }
}
