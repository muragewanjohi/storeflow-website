/**
 * Static Options Utilities
 * 
 * Helper functions for managing tenant settings stored in static_options table
 */

import { prisma } from '@/lib/prisma/client';

/**
 * Get a static option value for a tenant
 */
export async function getStaticOption(
  tenantId: string,
  optionName: string
): Promise<string | null> {
  try {
    const option = await prisma.static_options.findUnique({
      where: {
        tenant_id_option_name: {
          tenant_id: tenantId,
          option_name: optionName,
        },
      },
    });

    return option?.option_value || null;
  } catch (error) {
    console.error(`Error getting static option ${optionName}:`, error);
    return null;
  }
}

/**
 * Set a static option value for a tenant
 */
export async function setStaticOption(
  tenantId: string,
  optionName: string,
  optionValue: string | null
): Promise<void> {
  try {
    await prisma.static_options.upsert({
      where: {
        tenant_id_option_name: {
          tenant_id: tenantId,
          option_name: optionName,
        },
      },
      create: {
        tenant_id: tenantId,
        option_name: optionName,
        option_value: optionValue,
      },
      update: {
        option_value: optionValue,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error setting static option ${optionName}:`, error);
    throw error;
  }
}

/**
 * Get multiple static options at once
 */
export async function getStaticOptions(
  tenantId: string,
  optionNames: string[]
): Promise<Record<string, string | null>> {
  try {
    const options = await prisma.static_options.findMany({
      where: {
        tenant_id: tenantId,
        option_name: {
          in: optionNames,
        },
      },
    });

    const result: Record<string, string | null> = {};
    for (const name of optionNames) {
      result[name] = null;
    }

    for (const option of options) {
      result[option.option_name] = option.option_value;
    }

    return result;
  } catch (error: any) {
    // Check if it's a connection error
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database server")) {
      console.error('Database connection error. Please check your database connection settings.');
      throw new Error('Database connection failed. Please check your database connection and try again.');
    }
    console.error('Error getting static options:', error);
    // Return empty object for other errors to allow page to load with defaults
    return {};
  }
}

/**
 * Set multiple static options at once
 */
export async function setStaticOptions(
  tenantId: string,
  options: Record<string, string | null>
): Promise<void> {
  try {
    await Promise.all(
      Object.entries(options).map(([optionName, optionValue]) =>
        setStaticOption(tenantId, optionName, optionValue)
      )
    );
  } catch (error) {
    console.error('Error setting static options:', error);
    throw error;
  }
}

