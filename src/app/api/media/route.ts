/**
 * Media Library API Route
 * 
 * Handles GET requests for listing media files from Supabase Storage
 * Used for media library gallery
 * 
 * Day 28: Content Management - Media Library
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/media
 * 
 * List all media files for the current tenant
 * 
 * Query params:
 * - limit: Number of files to return (default: 50)
 * - offset: Number of files to skip (default: 0)
 * - search: Search by filename (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    // Create Supabase client with service role for storage operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get bucket name from environment variable or use default
    const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'product-images';

    // Sync operation: Only run if explicitly requested or if no records exist
    // This prevents slow sync on every request
    const syncRequested = searchParams.get('sync') === 'true';
    const recordCount = await prisma.media_uploads.count({
      where: { tenant_id: tenant.id },
    });

    // Only sync if explicitly requested or if tenant has no records
    if (syncRequested || recordCount === 0) {
      const tenantFolder = `media/${tenant.id}/`;
      
      const { data: storageFiles, error: listError } = await supabase.storage
        .from(bucketName)
        .list(tenantFolder, {
          limit: 1000, // Get all files to sync
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (!listError && storageFiles && storageFiles.length > 0) {
        // Get existing paths efficiently (only paths, indexed query)
        const existingRecords = await prisma.media_uploads.findMany({
          where: { tenant_id: tenant.id },
          select: { path: true },
        });

        const existingPaths = new Set(existingRecords.map((r: any) => r.path).filter(Boolean));

        // Create database records for files in storage that don't have records
        const filesToCreate = storageFiles
          .filter((file: any) => {
            const filePath = `${tenantFolder}${file.name}`;
            return !existingPaths.has(filePath);
          })
          .map((file: any) => {
            const filePath = `${tenantFolder}${file.name}`;
            const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
            const mimeType = 
              fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' :
              fileExt === 'png' ? 'image/png' :
              fileExt === 'webp' ? 'image/webp' :
              fileExt === 'gif' ? 'image/gif' :
              'image/jpeg';

            return {
              tenant_id: tenant.id,
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

    // Build Prisma query
    const where: any = {
      tenant_id: tenant.id,
    };

    // Add search filter (search by title or path/filename)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { path: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch media records from database
    const [mediaRecords, total] = await Promise.all([
      prisma.media_uploads.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.media_uploads.count({ where }),
    ]);

    // Get public URLs for each file
    const mediaFiles = await Promise.all(
      mediaRecords.map(async (record: any) => {
        if (!record.path) {
          return null;
        }

        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(record.path);

        // Extract filename from path for display
        const filename = record.path.split('/').pop() || 'unknown';

        return {
          id: record.id,
          name: filename,
          title: record.title,
          path: record.path,
          url: urlData.publicUrl,
          alt_text: record.alt_text,
          size: record.file_size || 0,
          type: record.file_type || 'image/jpeg',
          created_at: record.created_at?.toISOString() || new Date().toISOString(),
          updated_at: record.updated_at?.toISOString() || new Date().toISOString(),
        };
      })
    );

    // Filter out null values (files that don't exist in storage)
    const validFiles = mediaFiles.filter((f): f is NonNullable<typeof f> => f !== null);

    return NextResponse.json({
      files: validFiles,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Error listing media:', error);

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
          : 'Failed to list media files'
      },
      { status: 500 }
    );
  }
}

