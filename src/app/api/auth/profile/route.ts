import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long'),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Not authenticated', message: 'Please log in and try again.' },
        { status: 401 }
      );
    }

    const existingMetadata = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...existingMetadata,
        name: validated.name,
        profile_completed: true,
      },
    });

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile', message: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        name: validated.name,
        profile_completed: true,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', message: error.issues[0]?.message || 'Invalid input.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update profile', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
