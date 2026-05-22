import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

export class MediaAdminError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'MediaAdminError';
  }
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new MediaAdminError('Storage service is not configured', 500);
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function getBucketName() {
  return process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'product-images';
}

export type ListMediaOptions = {
  limit?: number;
  offset?: number;
  search?: string;
  sync?: boolean;
};

export async function listMediaForTenant(tenantId: string, options: ListMediaOptions = {}) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const search = options.search?.trim() ?? '';
  const syncRequested = options.sync === true;

  const supabase = getSupabaseClient();
  const bucketName = getBucketName();

  const recordCount = await prisma.media_uploads.count({
    where: { tenant_id: tenantId },
  });

  if (syncRequested || recordCount === 0) {
    const tenantFolder = `media/${tenantId}/`;
    const { data: storageFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list(tenantFolder, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (!listError && storageFiles && storageFiles.length > 0) {
      const existingRecords = await prisma.media_uploads.findMany({
        where: { tenant_id: tenantId },
        select: { path: true },
      });
      const existingPaths = new Set(existingRecords.map((r) => r.path).filter(Boolean));

      const filesToCreate = storageFiles
        .filter((file) => {
          const filePath = `${tenantFolder}${file.name}`;
          return !existingPaths.has(filePath);
        })
        .map((file) => {
          const filePath = `${tenantFolder}${file.name}`;
          const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
          const mimeType =
            fileExt === 'jpg' || fileExt === 'jpeg'
              ? 'image/jpeg'
              : fileExt === 'png'
                ? 'image/png'
                : fileExt === 'webp'
                  ? 'image/webp'
                  : fileExt === 'gif'
                    ? 'image/gif'
                    : 'image/jpeg';

          return {
            tenant_id: tenantId,
            title: null,
            path: filePath,
            alt_text: null,
            file_type: mimeType,
            file_size: file.metadata?.size || 0,
            is_synced: true,
            created_at: file.created_at ? new Date(file.created_at) : new Date(),
            updated_at: file.updated_at ? new Date(file.updated_at) : new Date(),
          };
        });

      if (filesToCreate.length > 0) {
        await prisma.media_uploads.createMany({
          data: filesToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  const where: {
    tenant_id: string;
    OR?: Array<Record<string, unknown>>;
  } = { tenant_id: tenantId };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { path: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [mediaRecords, total] = await Promise.all([
    prisma.media_uploads.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.media_uploads.count({ where }),
  ]);

  const mediaFiles = await Promise.all(
    mediaRecords.map(async (record) => {
      if (!record.path) return null;

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(record.path);
      const filename = record.path.split('/').pop() || 'unknown';

      return {
        id: record.id,
        name: filename,
        title: record.title,
        path: record.path,
        url: urlData.publicUrl,
        alt_text: record.alt_text,
        altText: record.alt_text,
        size: record.file_size || 0,
        type: record.file_type || 'image/jpeg',
        created_at: record.created_at?.toISOString() || new Date().toISOString(),
        updated_at: record.updated_at?.toISOString() || new Date().toISOString(),
        createdAt: record.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: record.updated_at?.toISOString() || new Date().toISOString(),
      };
    }),
  );

  const items = mediaFiles.filter((f): f is NonNullable<typeof f> => f !== null);

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

export const updateMediaSchema = z.object({
  title: z.string().max(255).nullable().optional().or(z.literal('')),
  alt_text: z.string().max(255).nullable().optional().or(z.literal('')),
  altText: z.string().max(255).nullable().optional().or(z.literal('')),
});

export async function updateMediaForTenant(
  tenantId: string,
  mediaId: string,
  body: unknown,
) {
  const validatedData = updateMediaSchema.parse(body);
  const altTextInput = validatedData.alt_text ?? validatedData.altText;

  const existingMedia = await prisma.media_uploads.findFirst({
    where: { id: mediaId, tenant_id: tenantId },
    select: { id: true, title: true, alt_text: true },
  });

  if (!existingMedia) {
    throw new MediaAdminError('Media file not found', 404);
  }

  const titleValue =
    validatedData.title !== undefined
      ? validatedData.title === ''
        ? null
        : validatedData.title
      : existingMedia.title;
  const altTextValue =
    altTextInput !== undefined ? (altTextInput === '' ? null : altTextInput) : existingMedia.alt_text;

  const updatedMedia = await prisma.media_uploads.update({
    where: { id: mediaId },
    data: {
      title: titleValue,
      alt_text: altTextValue,
      updated_at: new Date(),
    },
  });

  return {
    id: updatedMedia.id,
    title: updatedMedia.title,
    alt_text: updatedMedia.alt_text,
    altText: updatedMedia.alt_text,
  };
}

export async function deleteMediaForTenant(tenantId: string, mediaId: string) {
  const existingMedia = await prisma.media_uploads.findFirst({
    where: { id: mediaId, tenant_id: tenantId },
    select: { path: true },
  });

  if (!existingMedia) {
    throw new MediaAdminError('Media file not found', 404);
  }

  if (existingMedia.path) {
    const supabase = getSupabaseClient();
    const bucketName = getBucketName();
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([existingMedia.path]);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
    }
  }

  await prisma.media_uploads.delete({ where: { id: mediaId } });
  return { id: mediaId };
}
