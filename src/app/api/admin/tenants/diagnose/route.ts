/**
 * API Route: Tenant Diagnosis
 * 
 * GET /api/admin/tenants/diagnose?subdomain=matunda
 * 
 * Diagnose tenant resolution issues for a given subdomain
 * Only accessible to landlord/admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'subdomain parameter is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Check tenant in Supabase
    const { data: supabaseTenant, error: supabaseError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', normalizedSubdomain)
      .maybeSingle();

    // Also check in Prisma (direct database)
    const prismaTenant = await prisma.tenants.findFirst({
      where: {
        subdomain: normalizedSubdomain,
      },
    });

    // Check for case variations
    const { data: caseVariations } = await supabase
      .from('tenants')
      .select('id, subdomain, status, name')
      .ilike('subdomain', normalizedSubdomain);

    // Check for similar subdomains
    const { data: similarSubdomains } = await supabase
      .from('tenants')
      .select('id, subdomain, status, name')
      .ilike('subdomain', `%${normalizedSubdomain}%`)
      .limit(10);

    const diagnosis = {
      subdomain: normalizedSubdomain,
      timestamp: new Date().toISOString(),
      supabase: {
        found: !!supabaseTenant,
        tenant: supabaseTenant ? {
          id: supabaseTenant.id,
          name: supabaseTenant.name,
          subdomain: supabaseTenant.subdomain,
          status: supabaseTenant.status,
          custom_domain: supabaseTenant.custom_domain,
          created_at: supabaseTenant.created_at,
        } : null,
        error: supabaseError?.message || null,
      },
      prisma: {
        found: !!prismaTenant,
        tenant: prismaTenant ? {
          id: prismaTenant.id,
          name: prismaTenant.name,
          subdomain: prismaTenant.subdomain,
          status: prismaTenant.status,
          custom_domain: prismaTenant.custom_domain,
          created_at: prismaTenant.created_at,
        } : null,
      },
      caseVariations: caseVariations || [],
      similarSubdomains: similarSubdomains?.filter(t => t.subdomain !== normalizedSubdomain) || [],
      resolution: {
        canResolve: !!supabaseTenant && supabaseTenant.status === 'active',
        issue: !supabaseTenant
          ? 'Tenant does not exist'
          : supabaseTenant.status !== 'active'
          ? `Tenant exists but status is '${supabaseTenant.status}' (expected 'active')`
          : 'Tenant should resolve correctly',
        recommendation: !supabaseTenant
          ? 'Create the tenant or check if subdomain is correct'
          : supabaseTenant.status !== 'active'
          ? `Update tenant status to 'active' in the database`
          : 'No action needed',
      },
    };

    return NextResponse.json(diagnosis);
  } catch (error: any) {
    console.error('Error diagnosing tenant:', error);
    return NextResponse.json(
      { 
        error: 'Failed to diagnose tenant',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
