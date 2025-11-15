/**
 * API Route: Domain Management (Admin)
 * 
 * Handles domain operations for tenants
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import {
  addTenantDomain,
  removeTenantDomain,
  verifyDomain,
  getDomainInfo,
  getDNSConfiguration,
} from '@/lib/vercel-domains';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/domains
 * 
 * Add a custom domain to a tenant
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    const projectId = process.env.VERCEL_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json(
        { error: 'Vercel project ID not configured' },
        { status: 500 }
      );
    }

    // Add domain to Vercel
    const domainInfo = await addTenantDomain(domain, projectId);

    // Update tenant with custom domain
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ custom_domain: domain })
      .eq('id', tenant.id);

    if (updateError) {
      console.error('Failed to update tenant domain:', updateError);
      // Domain added to Vercel but failed to update DB
      // Consider rolling back or retrying
    }

    return NextResponse.json({
      success: true,
      domain: domainInfo,
      message: 'Domain added successfully',
    });
  } catch (error: any) {
    console.error('Error adding domain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add domain' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/domains
 * 
 * Remove a custom domain from a tenant
 */
export async function DELETE(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required' },
        { status: 400 }
      );
    }

    // Verify domain belongs to tenant
    if (tenant.custom_domain !== domain) {
      return NextResponse.json(
        { error: 'Domain does not belong to this tenant' },
        { status: 403 }
      );
    }

    // Get project ID (required for Vercel API)
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json(
        { error: 'Vercel project ID not configured' },
        { status: 500 }
      );
    }

    // Remove domain from Vercel (use projectId for proper authorization)
    await removeTenantDomain(domain, projectId);

    // Update tenant to remove custom domain
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ custom_domain: null })
      .eq('id', tenant.id);

    if (updateError) {
      console.error('Failed to update tenant domain:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Domain removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing domain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove domain' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/domains
 * 
 * Get domain information and verification status
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') || tenant.custom_domain;

    if (!domain) {
      return NextResponse.json({
        domain: null,
        verified: false,
        message: 'No custom domain configured',
      });
    }

    // Get project ID (required for Vercel API)
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json(
        { error: 'Vercel project ID not configured' },
        { status: 500 }
      );
    }

    // Get domain info from Vercel (always use projectId for proper authorization)
    const domainInfo = await getDomainInfo(domain, projectId);
    const verification = await verifyDomain(domain, projectId);
    const dnsConfig = await getDNSConfiguration(domain, projectId);

    return NextResponse.json({
      domain: domainInfo,
      verification,
      dnsConfig,
    });
  } catch (error: any) {
    console.error('Error getting domain info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get domain info' },
      { status: 500 }
    );
  }
}

