/**
 * Debug endpoint for product creation
 * 
 * This endpoint helps diagnose issues with product creation
 * by testing each step individually
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // Test 1: Authentication
    try {
      const user = await requireAuth();
      results.checks.auth = { success: true, userId: user.id };
    } catch (error: any) {
      results.checks.auth = { success: false, error: error.message };
      return NextResponse.json(results, { status: 200 });
    }

    // Test 2: Tenant resolution
    try {
      const tenant = await requireTenant();
      results.checks.tenant = { success: true, tenantId: tenant.id, tenantName: tenant.name };
    } catch (error: any) {
      results.checks.tenant = { success: false, error: error.message };
      return NextResponse.json(results, { status: 200 });
    }

    // Test 3: Edit access
    try {
      const { requireEditAccess } = await import('@/lib/tenant-context/access-control-server');
      await requireEditAccess();
      results.checks.editAccess = { success: true };
    } catch (error: any) {
      results.checks.editAccess = { success: false, error: error.message };
      return NextResponse.json(results, { status: 200 });
    }

    // Test 4: Database connection
    try {
      const tenant = await requireTenant();
      const productCount = await prisma.products.count({
        where: { tenant_id: tenant.id },
      });
      results.checks.database = { success: true, productCount };
    } catch (error: any) {
      results.checks.database = { 
        success: false, 
        error: error.message,
        code: (error as any)?.code,
        meta: (error as any)?.meta,
      };
      return NextResponse.json(results, { status: 200 });
    }

    // Test 5: Plan limits check
    try {
      const tenant = await requireTenant();
      const { canCreateProduct } = await import('@/lib/subscriptions/limits');
      const limitCheck = await canCreateProduct(tenant);
      results.checks.limits = { success: true, ...limitCheck };
    } catch (error: any) {
      results.checks.limits = { success: false, error: error.message };
      return NextResponse.json(results, { status: 200 });
    }

    // Test 6: Sample product data validation
    try {
      const { createProductSchema } = await import('@/lib/products/validation');
      const sampleData = {
        name: 'Test Product',
        price: 10.99,
        stock_quantity: 100,
        status: 'active',
      };
      const validated = createProductSchema.parse(sampleData);
      results.checks.validation = { success: true, validated: Object.keys(validated) };
    } catch (error: any) {
      results.checks.validation = { 
        success: false, 
        error: error.message,
        issues: (error as any)?.issues,
      };
      return NextResponse.json(results, { status: 200 });
    }

    results.success = true;
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    results.error = error.message;
    results.stack = error.stack;
    return NextResponse.json(results, { status: 500 });
  }
}
