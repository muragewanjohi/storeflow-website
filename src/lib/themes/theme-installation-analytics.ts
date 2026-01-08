/**
 * Theme Installation Analytics
 * 
 * Tracks theme installation events, success/failure rates, and related metrics
 * for monitoring and improving the theme installation experience.
 */

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

export interface ThemeInstallationMetrics {
  theme_id: string;
  theme_slug: string;
  theme_title: string;
  tenant_id: string;
  is_new_install: boolean;
  homepage_created: boolean;
  additional_pages_created: number;
  demo_content_created: boolean;
  demo_categories_created: number;
  demo_products_created: number;
  defaults_applied: boolean;
  success: boolean;
  error_message?: string;
  installation_duration_ms?: number;
}

/**
 * Track theme installation event
 */
export async function trackThemeInstallation(
  prisma: PrismaClient,
  request: NextRequest,
  metrics: ThemeInstallationMetrics
): Promise<void> {
  try {
    const headersList = request.headers;
    
    // Get IP address and user agent
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    
    // Get country from headers (if available from CDN/proxy)
    const country = headersList.get('cf-ipcountry') || 
                    headersList.get('x-vercel-ip-country') || 
                    headersList.get('x-country-code') ||
                    null;

    // Build metadata with installation details
    const metadata = {
      theme_id: metrics.theme_id,
      theme_slug: metrics.theme_slug,
      theme_title: metrics.theme_title,
      tenant_id: metrics.tenant_id,
      is_new_install: metrics.is_new_install,
      homepage_created: metrics.homepage_created,
      additional_pages_created: metrics.additional_pages_created,
      demo_content_created: metrics.demo_content_created,
      demo_categories_created: metrics.demo_categories_created,
      demo_products_created: metrics.demo_products_created,
      defaults_applied: metrics.defaults_applied,
      installation_duration_ms: metrics.installation_duration_ms,
      ...(metrics.error_message && { error_message: metrics.error_message }),
    };

    // Create analytics tracking record
    await prisma.analytics_tracking.create({
      data: {
        user_id: null, // Theme installations are tenant-scoped, not user-scoped
        page_path: '/api/themes/install',
        page_title: `Theme Installation: ${metrics.theme_title}`,
        event_name: metrics.success ? 'theme_installation_success' : 'theme_installation_failure',
        event_category: 'theme_management',
        event_label: metrics.theme_slug,
        event_value: metrics.success ? 1 : 0,
        metadata: metadata,
        ip_address: ipAddress,
        country: country,
        user_agent: userAgent,
      },
    });
  } catch (error) {
    // Don't fail theme installation if analytics tracking fails
    console.error('Error tracking theme installation analytics:', error);
  }
}

/**
 * Get theme installation statistics
 */
export async function getThemeInstallationStats(
  prisma: PrismaClient,
  options: {
    themeSlug?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  total_installations: number;
  successful_installations: number;
  failed_installations: number;
  success_rate: number;
  themes_with_homepage: number;
  themes_with_demo_content: number;
  average_installation_time_ms: number;
  by_theme: Array<{
    theme_slug: string;
    installations: number;
    success_rate: number;
  }>;
}> {
  try {
    const where: any = {
      event_category: 'theme_management',
      event_name: {
        in: ['theme_installation_success', 'theme_installation_failure'],
      },
    };

    if (options.themeSlug) {
      where.event_label = options.themeSlug;
    }

    if (options.startDate || options.endDate) {
      where.created_at = {};
      if (options.startDate) {
        where.created_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.created_at.lte = options.endDate;
      }
    }

    // Get all installation events
    const events = await prisma.analytics_tracking.findMany({
      where,
      select: {
        event_name: true,
        event_label: true,
        metadata: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Calculate statistics
    const total_installations = events.length;
    const successful_installations = events.filter(
      (e) => e.event_name === 'theme_installation_success'
    ).length;
    const failed_installations = total_installations - successful_installations;
    const success_rate = total_installations > 0 
      ? (successful_installations / total_installations) * 100 
      : 0;

    // Count themes with homepage and demo content
    let themes_with_homepage = 0;
    let themes_with_demo_content = 0;
    const installation_times: number[] = [];

    events.forEach((event) => {
      const metadata = event.metadata as any;
      if (metadata?.homepage_created) {
        themes_with_homepage++;
      }
      if (metadata?.demo_content_created) {
        themes_with_demo_content++;
      }
      if (metadata?.installation_duration_ms) {
        installation_times.push(metadata.installation_duration_ms);
      }
    });

    const average_installation_time_ms = installation_times.length > 0
      ? installation_times.reduce((a, b) => a + b, 0) / installation_times.length
      : 0;

    // Group by theme
    const byThemeMap = new Map<string, { total: number; successful: number }>();
    events.forEach((event) => {
      const themeSlug = event.event_label || 'unknown';
      if (!byThemeMap.has(themeSlug)) {
        byThemeMap.set(themeSlug, { total: 0, successful: 0 });
      }
      const stats = byThemeMap.get(themeSlug)!;
      stats.total++;
      if (event.event_name === 'theme_installation_success') {
        stats.successful++;
      }
    });

    const by_theme = Array.from(byThemeMap.entries()).map(([theme_slug, stats]) => ({
      theme_slug,
      installations: stats.total,
      success_rate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
    }));

    return {
      total_installations,
      successful_installations,
      failed_installations,
      success_rate,
      themes_with_homepage,
      themes_with_demo_content,
      average_installation_time_ms,
      by_theme,
    };
  } catch (error) {
    console.error('Error getting theme installation stats:', error);
    throw error;
  }
}

/**
 * Identify themes without layout files
 */
export async function identifyThemesWithoutLayouts(
  prisma: PrismaClient
): Promise<Array<{ theme_slug: string; theme_title: string; installation_count: number }>> {
  try {
    // Get all themes
    const themes = await prisma.themes.findMany({
      where: { status: true },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    // Get installation counts for each theme
    const themesWithCounts = await Promise.all(
      themes.map(async (theme) => {
        const installations = await prisma.analytics_tracking.count({
          where: {
            event_category: 'theme_management',
            event_label: theme.slug,
            event_name: 'theme_installation_success',
          },
        });

        return {
          theme_slug: theme.slug,
          theme_title: theme.title,
          installation_count: installations,
        };
      })
    );

    // Note: We can't directly check if layout files exist from the database
    // This would require file system access. For now, we return themes with their installation counts.
    // Themes with 0 installations might indicate they need layouts, but this is just a heuristic.
    
    return themesWithCounts.sort((a, b) => b.installation_count - a.installation_count);
  } catch (error) {
    console.error('Error identifying themes without layouts:', error);
    throw error;
  }
}
