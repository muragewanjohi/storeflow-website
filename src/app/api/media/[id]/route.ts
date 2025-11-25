/**
 * Media Update & Delete API Route
 * 
 * Handles PUT requests for updating media file metadata (title, alt_text)
 * Handles DELETE requests for deleting media files
 * 
 * Day 28: Content Management - Media Library
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateMediaSchema = z.object({
  title: z.string().max(255).nullable().optional().or(z.literal('')),
  alt_text: z.string().max(255).nullable().optional().or(z.literal('')),
});

/**
 * PUT /api/media/[id]
 * 
 * Update media file metadata (title, alt_text)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateMediaSchema.parse(body);

    // Check if media record exists and belongs to tenant
    // Only select fields we need for better performance
    const existingMedia = await prisma.media_uploads.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        title: true,
        alt_text: true,
      },
    });

    if (!existingMedia) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      );
    }

    // Update media record
    // Convert empty strings to null
    const titleValue = validatedData.title !== undefined 
      ? (validatedData.title === '' ? null : validatedData.title)
      : existingMedia.title;
    const altTextValue = validatedData.alt_text !== undefined
      ? (validatedData.alt_text === '' ? null : validatedData.alt_text)
      : existingMedia.alt_text;

    const updatedMedia = await prisma.media_uploads.update({
      where: { id },
      data: {
        title: titleValue,
        alt_text: altTextValue,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Media updated successfully',
      id: updatedMedia.id,
      title: updatedMedia.title,
      alt_text: updatedMedia.alt_text,
    });
  } catch (error) {
    console.error('Error updating media:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

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
          : 'Failed to update media'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/[id]
 * 
 * Delete a media file from database and Supabase Storage
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const { id } = await params;

    // Check if media record exists and belongs to tenant
    // Only select path for deletion to improve performance
    const existingMedia = await prisma.media_uploads.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      select: {
        path: true,
      },
    });

    if (!existingMedia) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      );
    }

    // Delete from Supabase Storage if path exists
    if (existingMedia.path) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'product-images';

      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([existingMedia.path]);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    await prisma.media_uploads.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Media file deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting media:', error);

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
          : 'Failed to delete media'
      },
      { status: 500 }
    );
  }
}

