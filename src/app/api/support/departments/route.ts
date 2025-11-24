/**
 * Support Departments API Routes
 * 
 * GET: List support departments
 * POST: Create support department
 * 
 * Note: Since there's no support_departments table in the schema,
 * we'll use a simple approach with tenant metadata or create a basic structure.
 * For now, we'll return a default list and allow creation via metadata.
 * 
 * Day 21.5: Support Ticket System
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { supportDepartmentSchema } from '@/lib/support/validation';

/**
 * GET /api/support/departments - List support departments
 * 
 * Returns default departments if none exist in tenant metadata
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Default departments (can be customized per tenant)
    const defaultDepartments = [
      { id: 'general', name: 'General Support', description: 'General inquiries and support', email: null },
      { id: 'technical', name: 'Technical Support', description: 'Technical issues and troubleshooting', email: null },
      { id: 'billing', name: 'Billing & Payments', description: 'Billing and payment inquiries', email: null },
      { id: 'sales', name: 'Sales', description: 'Sales inquiries and product information', email: null },
    ];

    // Try to get custom departments from tenant metadata
    // For now, we'll return default departments
    // In a full implementation, you'd store departments in tenant.metadata or a separate table

    return NextResponse.json({
      success: true,
      departments: defaultDepartments,
    });
  } catch (error: any) {
    console.error('Error fetching support departments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch support departments' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/support/departments - Create support department
 * 
 * Note: This is a placeholder. In a full implementation, you'd create a support_departments table
 * or store departments in tenant metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    
    const body = await request.json();
    const validatedData = supportDepartmentSchema.parse(body);

    // For now, return success with the department data
    // In a full implementation, you'd save this to a database table
    const department = {
      id: `dept-${Date.now()}`,
      name: validatedData.name,
      description: validatedData.description || null,
      email: validatedData.email || null,
    };

    return NextResponse.json(
      { success: true, department },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating support department:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create support department' },
      { status: error.status || 500 }
    );
  }
}

