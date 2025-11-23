/**
 * API Route: Landlord Registration
 * 
 * POST /api/auth/landlord/register
 * 
 * Register a new landlord (admin) user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    const { email, password, name } = validatedData;

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if email already exists using admin client
    try {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existingUser = users.find((u) => u.email === email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
    } catch (checkError) {
      // If check fails, continue with signup (signup will also check)
      console.warn('Could not check existing user:', checkError);
    }

    // Create landlord user with role metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'landlord',
          name,
        },
      },
    });

    if (authError) {
      // Check if error is due to existing email
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json(
          { 
            error: 'Email already registered',
            message: 'A user with this email address already exists'
          },
          { status: 409 } // 409 Conflict for duplicate resources
        );
      }
      
      console.error('Registration error:', authError);
      return NextResponse.json(
        { 
          error: 'Registration failed',
          message: authError.message || 'An error occurred during registration'
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { 
          error: 'Registration failed',
          message: 'User creation completed but no user data was returned'
        },
        { status: 500 }
      );
    }

    // Update user metadata to include role using admin client
    try {
      await adminClient.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          role: 'landlord',
          name,
        },
      });
    } catch (updateError) {
      console.error('Failed to update user metadata:', updateError);
      // Continue even if metadata update fails (metadata was set during signup)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'landlord',
      },
      message: 'Registration successful. Please check your email to verify your account.',
    }, { status: 201 });
  } catch (error: any) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: 'Please check your input and try again',
          details: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Registration failed',
        message: 'An unexpected error occurred. Please try again.',
        ...(isDevelopment && { details: error.message })
      },
      { status: 500 }
    );
  }
}

