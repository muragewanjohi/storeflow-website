import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * POST /api/v1/proximity/vendor/uploads
 * Upload a campaign image for the signed-in advertiser.
 */
export async function POST(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPEG, PNG, WebP, GIF) are allowed.' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const filePath = `media/${advertiser.tenant_id}/proximity/${advertiser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'product-images';

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error('Vendor campaign image upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    try {
      await prisma.media_uploads.create({
        data: {
          tenant_id: advertiser.tenant_id,
          title: null,
          path: filePath,
          alt_text: null,
          file_type: file.type,
          file_size: file.size,
          is_synced: true,
        },
      });
    } catch (error) {
      console.warn('Could not create media_uploads record:', error);
    }

    return NextResponse.json({ url: urlData.publicUrl, path: filePath });
  } catch (error) {
    return jsonError(error);
  }
}
